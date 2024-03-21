package main

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"regexp"
	"strings"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j/dbtype"
)

/*
******************************************************************

	DATABASE SETUP FUNCTIONS

******************************************************************
*/
func createRootDirectory() {
	result, err := neo4j.ExecuteQuery(ctx, driver,
		"MERGE (d:Directory {name: $name}) RETURN d",
		map[string]any{
			"name": "root",
		}, neo4j.EagerResultTransformer,
		neo4j.ExecuteQueryWithDatabase("neo4j"))
	if err != nil {
		panic(err)
	}

	fmt.Printf("Created %v nodes in %+v.\n", len(result.Records),
		result.Summary.ResultAvailableAfter())
}

func clearDB() {

	_, err := neo4j.ExecuteQuery(ctx, driver,
		"MATCH (n) DETACH DELETE n",
		nil, neo4j.EagerResultTransformer,
		neo4j.ExecuteQueryWithDatabase("neo4j"))
	if err != nil {
		panic(err)
	}

	fmt.Printf("Cleared DB.\n")

}

/*
******************************************************************
	FETCHING FUNCTIONS
******************************************************************
*/

type FileNode struct {
	name  string
	s3key string
}

func getContainedNodes(dirName string, isTimeline bool) ([]string, error) {

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	var result neo4j.ResultWithContext
	var err error

	if isTimeline {
		result, err = session.Run(ctx,
			"MATCH (d:TimelineDirectory {name: $name})-[:CONTAINS]->(n) RETURN n",
			map[string]any{
				"name": dirName,
			},
		)
	} else {
		result, err = session.Run(ctx,
			"MATCH (d:Directory {name: $name})-[:CONTAINS]->(n) RETURN n",
			map[string]any{
				"name": dirName,
			},
		)
	}

	if err != nil {
		fmt.Println("Error executing Neo4j query:", err)
		return nil, err
	}

	var nodes []string
	for result.Next(ctx) {
		node, exists := result.Record().Get("n")
		if !exists {
			return nil, fmt.Errorf("Node not found: %s", dirName)
		}
		fields := node.(dbtype.Node).Props
		name := fields["name"].(string)
		nodes = append(nodes, name)
	}

	return nodes, nil
}

func isValidDate(dateStr string) bool {

	pattern := `^(-?\d+)(-\d{2}){2}( \d{2}:\d{2}:\d{2})?$`
	regex := regexp.MustCompile(pattern)

	// TODO, check if day and month are in valid ranges?

	// Check if the date string matches the pattern
	return regex.MatchString(dateStr)
}

type Match struct {
	Text         string
	TimelineName string
	StartDate    string
	EndDate      string
}

func extractVariables(content string) ([]Match, error) {
	var matches []Match

	// Define the regex pattern
	pattern := regexp.MustCompile(`\((.*?)\)\[(.*?)\]\{(.*?)\}\{(.*?)\}`)

	// Find all matches of the regex pattern in the content
	matchStrings := pattern.FindAllStringSubmatch(content, -1)

	// Extract variables from each match and append to the matches slice
	for _, match := range matchStrings {
		if len(match) >= 5 {
			if !isValidDate(match[3]) || !isValidDate(match[4]) {
				return nil, fmt.Errorf("invalid date string")
			}
			if match[1] == "" || len(match[1]) > 100 {
				return nil, fmt.Errorf("invalid event name: %s", match[1])
			}
			m := Match{
				Text:         match[1],
				TimelineName: match[2],
				StartDate:    match[3],
				EndDate:      match[4],
			}
			matches = append(matches, m)
		}
	}

	return matches, nil
}

func updateTimelines(parent string, fileName string, file multipart.File) error {

	// Read the content of the file
	_, _ = file.Seek(0, io.SeekStart)
	content, _ := io.ReadAll(file)
	matches, err := extractVariables(string(content))
	if err != nil {
		return err
	}

	for _, match := range matches {
		fmt.Println("found match for ", match.TimelineName)
		fmt.Println(match)
		err := updateTimeline(match.Text, parent, fileName, match.TimelineName, match.StartDate, match.EndDate)
		if err != nil {
			fmt.Println("got error", err)
			return err
		}
	}

	// TODO check all matches against the neo4j graph and update if a timeline was deleted

	return nil
}

func updateTimeline(eventName string, parent string, fileName string, timelineName string, startDate string, endDate string) error {

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	timelineFound := false

	result, err := session.Run(ctx,
		`MATCH (d:Directory {name: $parent})-[:CONTAINS]->(f:File {name: $fileName})
		MATCH (t:Timeline {name: $timelineName})
		WITH d, f, t
		WHERE t IS NOT NULL
		MERGE (t)-[r:LINKED {name: $ev}]->(f)
		ON CREATE SET r.startDate = $startDate, r.endDate = $endDate, r.name = $ev
		ON MATCH SET r.startDate = $startDate, r.endDate = $endDate
		RETURN t IS NOT NULL AS timelineFound
		`,
		map[string]interface{}{
			"parent":       parent,
			"fileName":     fileName,
			"timelineName": timelineName,
			"startDate":    startDate,
			"endDate":      endDate,
			"ev":           eventName,
		},
	)
	if err != nil {
		return err
	}

	for result.Next(ctx) {
		record := result.Record()
		// Retrieve the value of timelineFound
		timelineFoundValue, ok := record.Get("timelineFound")
		if ok {
			timelineFound = timelineFoundValue.(bool)
		}
	}

	if !timelineFound {
		// Handle the case where a Timeline node was not found
		return fmt.Errorf("failed to find %s", timelineName)
	}

	fmt.Println("created link successfully")

	return nil
}

type RelationshipLink struct {
	ParentFolder string `json:"parentFolder"`
	FileName     string `json:"fileName"`
	StartDate    string `json:"startDate"`
	EndDate      string `json:"endDate"`
	EventName    string `json:"eventName"`
}

type TimelineWithRelationships struct {
	TimelineName  string             `json:"timelineName"`
	Relationships []RelationshipLink `json:"relationships"`
}

func getTimelineContents(timelineName string) (*TimelineWithRelationships, error) {

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	// get the matching timeline and links
	result, err := session.Run(ctx,
		`MATCH (t {name: $child}) 
		OPTIONAL MATCH (t)-[r:LINKED]->(f)<-[:CONTAINS]-(d)
		RETURN t.name AS timelineName, f.name AS fileName, d.name AS parentName, COLLECT(r) AS relationships`,
		map[string]interface{}{
			"child": timelineName,
		},
	)
	if err != nil {
		return nil, err
	}

	// Process the query result
	var timeline TimelineWithRelationships
	for result.Next(ctx) {
		record := result.Record()

		// name of timeline
		tlName, exists := record.Get("timelineName")
		if !exists {
			return nil, fmt.Errorf("no timeline name")
		}
		timeline.TimelineName = tlName.(string)

		// name of linked file
		fileName, exists := record.Get("fileName")
		if !exists {
			return nil, fmt.Errorf("no file name")
		}

		// name of parent folder
		parentName, exists := record.Get("parentName")
		if !exists {
			return nil, fmt.Errorf("no parent folder")
		}

		// linked relationships
		relationshipsInterface, exists := record.Get("relationships")
		if !exists {
			return nil, fmt.Errorf("no relationships found")
		}

		// Type assertion to convert to []interface{}
		relationships, ok := relationshipsInterface.([]interface{})
		if !ok {
			return nil, fmt.Errorf("unexpected type for relationships")
		}

		// loop thru relationships and fill out structs
		for _, rel := range relationships {
			dbRel := rel.(dbtype.Relationship)
			fmt.Println(dbRel)
			linkMap := dbRel.Props
			if linkMap == nil {
				return nil, fmt.Errorf("link map missing dates")
			}

			var relStruct RelationshipLink
			relStruct.StartDate = linkMap["startDate"].(string)
			relStruct.EndDate = linkMap["endDate"].(string)
			relStruct.FileName = fileName.(string)
			relStruct.ParentFolder = parentName.(string)
			relStruct.EventName = linkMap["name"].(string)
			timeline.Relationships = append(timeline.Relationships, relStruct)

		}
	}

	return &timeline, nil

}

func getS3KeyForImage(parent string, name string) (string, error) {
	fmt.Printf("Getting s3 key for image: %s\n", name)

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	fmt.Println("Executing Neo4j query...")

	result, err := session.Run(ctx,
		"MATCH (f:File {name: $parent})-[:LINKED]->(m:Media {name: $child}) RETURN m",
		map[string]interface{}{
			"parent": (parent),
			"child":  name,
		},
	)

	if err != nil {
		fmt.Println("Error executing Neo4j query:", err)
		return "", err
	}

	if result.Next(ctx) {
		record := result.Record()
		fileNode, exists := record.Get("m")
		if !exists {
			return "", fmt.Errorf("media Node not found: %s", name)
		}

		dbFileNode, ok := fileNode.(dbtype.Node)
		if !ok {
			return "", fmt.Errorf("unexpected type for mediaNode")
		}

		s3key, exists := dbFileNode.Props["s3key"]
		if !exists {
			return "", fmt.Errorf("S3 key not found for media: %s", name)
		}
		return s3key.(string), nil
	}

	return "", fmt.Errorf("media not found: %s", name)

}

func isFolderRoot(parent string) bool {
	return parent == "root"
}

func generateS3Key(parent string, fileName string) (string, error) {

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	// initially path only contains parent
	var path []string
	path = append(path, parent)

	// loop and add to path until we reach the root
	folderName := parent
	atRoot := isFolderRoot(folderName)
	for !atRoot {

		// query for parent of folderName
		result, err := session.Run(ctx,
			"MATCH (d:Directory)-[:CONTAINS]->(c:Directory {name: $child}) RETURN d",
			map[string]interface{}{
				"child": folderName,
			},
		)

		if err != nil {
			fmt.Println("Error executing Neo4j query:", err)
			return "", err
		}

		if result.Next(ctx) {
			record := result.Record()
			folderNode, exists := record.Get("d")
			if !exists {
				return "", fmt.Errorf("parent not found: %s", folderName)
			}

			dbFileNode, ok := folderNode.(dbtype.Node)
			if !ok {
				return "", fmt.Errorf("unexpected type for folderNode")
			}

			dbFolderName, exists := dbFileNode.Props["name"]
			if !exists {
				return "", fmt.Errorf("name for folder broken: %s", folderName)
			}

			folderName = dbFolderName.(string)
		}

		// add to path and update condition
		path = append(path, folderName)
		atRoot = isFolderRoot(folderName)
	}

	// remove root from path
	path = path[:len(path)-1]

	fmt.Println("path: ", path)

	var s3Key strings.Builder

	for i := len(path) - 1; i >= 0; i-- {
		s3Key.WriteString(path[i])
		s3Key.WriteString("/")
	}

	s3Key.WriteString(fileName)

	finalKey := s3Key.String()

	return finalKey, nil
}

func getMarkdowns3Key(parent string, fileName string) (string, error) {
	fmt.Printf("Getting s3 key for file: %s\n", fileName)

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	fmt.Println("Executing Neo4j query...")

	result, err := session.Run(ctx,
		"MATCH (d:Directory {name: $parent})-[:CONTAINS]->(f:File {name: $child}) RETURN f",
		map[string]interface{}{
			"parent": parent,
			"child":  fileName,
		},
	)

	if err != nil {
		fmt.Println("Error executing Neo4j query:", err)
		return "", err
	}

	if result.Next(ctx) {
		record := result.Record()
		fileNode, exists := record.Get("f")
		if !exists {
			return "", fmt.Errorf("file Node not found: %s", fileName)
		}

		dbFileNode, ok := fileNode.(dbtype.Node)
		if !ok {
			return "", fmt.Errorf("unexpected type for fileNode")
		}

		s3key, exists := dbFileNode.Props["s3key"]
		if !exists {
			return "", fmt.Errorf("s3 key not found for file: %s", fileName)
		}
		return s3key.(string), nil
	}

	return "", fmt.Errorf("file not found: %s", fileName)
}

/*
******************************************************************

	Utility Functions

******************************************************************
*/

func listFilesinDB() {

	result, err := neo4j.ExecuteQuery(ctx, driver,
		"MATCH (f:File) RETURN f LIMIT 25;",
		nil, neo4j.EagerResultTransformer,
		neo4j.ExecuteQueryWithDatabase("neo4j"))
	if err != nil {
		panic(err)
	}

	// Print the results
	for _, record := range result.Records {
		// Iterate over fields in each record
		file, _ := record.Get("f")
		fields := file.(dbtype.Node).Props
		name := fields["name"].(string)
		s3key := fields["s3key"].(string)

		fmt.Printf("File: %s\n", name)
		fmt.Printf("S3 Key: %s\n\n", s3key)
	}
	fmt.Printf("The query `%v` returned %v records in %+v.\n",
		result.Summary.Query().Text(), len(result.Records),
		result.Summary.ResultAvailableAfter())
}

func listNodesinDB() {

	result, err := neo4j.ExecuteQuery(ctx, driver,
		"MATCH (n) RETURN n LIMIT 25;",
		nil, neo4j.EagerResultTransformer,
		neo4j.ExecuteQueryWithDatabase("neo4j"))
	if err != nil {
		panic(err)
	}

	// Print the results
	for _, record := range result.Records {
		// Iterate over fields in each record
		for _, field := range record.Keys {
			value, exists := record.Get(field)
			if exists {
				fmt.Printf("%s: %v\n", field, value)
			} else {
				fmt.Printf("%s: <nil>\n", field)
			}
		}
	}
	fmt.Printf("The query `%v` returned %v records in %+v.\n",
		result.Summary.Query().Text(), len(result.Records),
		result.Summary.ResultAvailableAfter())
}

func getImagesFromMarkdownFile(filePath string) ([]string, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	// Regex pattern to match image links in markdown format
	pattern := `!\[.*?\]\((.*?)\)`
	re := regexp.MustCompile(pattern)
	matches := re.FindAllStringSubmatch(string(content), -1)

	images := make([]string, len(matches))
	for i, match := range matches {
		images[i] = match[1]
	}

	return images, nil
}

/*
******************************************************************
	DATABASE MODIFICATION FUNCTIONS
******************************************************************
*/

func removeTimelineObject(parent string, child string) error {
	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	fmt.Println("Executing Neo4j query...")

	_, err := session.Run(ctx,
		"MATCH (p:TimelineDirectory {name: $parent})-[:CONTAINS]->(c) WHERE c.name = $child DETACH DELETE c RETURN p",
		map[string]interface{}{
			"parent": parent,
			"child":  child,
		},
	)

	return err

}

func removeFolder(parent string, child string) error {
	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.Run(ctx,
		"MATCH (p:Directory {name: $parent})-[:CONTAINS]->(c:Directory {name: $child}) DETACH DELETE c RETURN p",
		map[string]interface{}{
			"parent": parent,
			"child":  child,
		},
	)

	return err
}

func removeFileNeo4j(parent string, child string) error {
	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.Run(ctx,
		`
		MATCH (p:Directory {name: $parent})-[:CONTAINS]->(c:File {name: $child})
		OPTIONAL MATCH (c)-[:LINKED]->(image:Image)
		DETACH DELETE c, image
		RETURN p
		`,
		map[string]interface{}{
			"parent": parent,
			"child":  child,
		},
	)

	return err
}

func matchCreateFolder(parent string, child string) error {

	fmt.Println("making ", parent, "/", child)

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.Run(ctx,
		"MATCH (p:Directory {name: $parent})"+
			"MERGE (p)-[:CONTAINS]->(c:Directory {name:$child})"+
			"RETURN c",
		map[string]interface{}{
			"parent": parent,
			"child":  child,
		},
	)

	return err
}

func matchCreateFile(parent string, child string, s3key string) error {
	fmt.Println("making ", parent, "/", child)

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.Run(ctx,
		"MATCH (p:Directory {name: $parent})"+
			"MERGE (p)-[:CONTAINS]->(c:File {name:$child, s3key:$s3key})"+
			"RETURN c",
		map[string]interface{}{
			"parent": parent,
			"child":  child,
			"s3key":  s3key,
		},
	)

	return err
}

func matchCreateTimeline(parent string, child string) error {

	fmt.Println("making ", parent, "/", child)

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.Run(ctx,
		"MATCH (p:TimelineDirectory {name: $parent})"+
			"MERGE (p)-[:CONTAINS]->(c:Timeline {name:$child})"+
			"RETURN c",
		map[string]interface{}{
			"parent": parent,
			"child":  child,
		},
	)

	return err
}

func matchCreateTimelineFolder(parent string, child string) error {
	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	fmt.Println("Executing Neo4j query...")

	_, err := session.Run(ctx,
		"MATCH (p:TimelineDirectory {name: $parent})"+
			"MERGE (p)-[:CONTAINS]->(c:TimelineDirectory {name:$child})"+
			"RETURN c",
		map[string]interface{}{
			"parent": parent,
			"child":  child,
		},
	)

	return err
}
