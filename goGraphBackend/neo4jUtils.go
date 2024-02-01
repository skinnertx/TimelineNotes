package main

import (
	"fmt"
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

func getContainedNodes(dirName string) ([]string, error) {

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.Run(ctx,
		"MATCH (d:Directory {name: $name})-[:CONTAINS]->(n) RETURN n",
		map[string]any{
			"name": dirName,
		},
	)

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

func getS3KeyForImage(parent string, name string) (string, error) {
	fmt.Printf("Getting s3 key for image: %s\n", name)

	fmt.Println("p ", parent)

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	fmt.Println("Executing Neo4j query...")

	result, err := session.Run(ctx,
		"MATCH (f:File {name: $parent})-[:LINKED]->(m:Media {name: $child}) RETURN m",
		map[string]interface{}{
			"parent": (parent + ".md"),
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
			return "", fmt.Errorf("Unexpected type for mediaNode")
		}

		s3key, exists := dbFileNode.Props["s3key"]
		if !exists {
			return "", fmt.Errorf("S3 key not found for media: %s", name)
		}
		return s3key.(string), nil
	}

	return "", fmt.Errorf("Media not found: %s", name)

}

func getS3KeyFromName(name string) (string, error) {
	fmt.Printf("Getting s3 key for file: %s\n", name)

	splits := strings.SplitN(name, ".", 2)
	if len(splits) < 2 {
		return "", fmt.Errorf("Error splitting fileName and path")
	}
	parent := splits[0]
	child := splits[1]

	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	fmt.Println("Executing Neo4j query...")

	result, err := session.Run(ctx,
		"MATCH (d:Directory {name: $parent})-[:CONTAINS]->(f:File {name: $child}) RETURN f",
		map[string]interface{}{
			"parent": parent,
			"child":  child,
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
			return "", fmt.Errorf("File Node not found: %s", name)
		}

		dbFileNode, ok := fileNode.(dbtype.Node)
		if !ok {
			return "", fmt.Errorf("Unexpected type for fileNode")
		}

		s3key, exists := dbFileNode.Props["s3key"]
		if !exists {
			return "", fmt.Errorf("S3 key not found for file: %s", name)
		}
		return s3key.(string), nil
	}

	return "", fmt.Errorf("File not found: %s", name)
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

// create directory node and link to parent directory node
func matchCreateDirNode(parent string, child string) {
	result, err := neo4j.ExecuteQuery(ctx, driver,
		"MATCH (p:Directory {name: $parent}) "+
			"MERGE (p)-[:CONTAINS]->(d:Directory {name: $child}) "+
			"RETURN d",
		map[string]any{
			"parent": parent,
			"child":  child,
		}, neo4j.EagerResultTransformer,
		neo4j.ExecuteQueryWithDatabase("neo4j"))
	if err != nil {
		panic(err)
	}

	fmt.Printf("Created %v nodes in %+v.\n", len(result.Records),
		result.Summary.ResultAvailableAfter())

}

// create file node and link to associated directory node
func matchCreateFileNode(prev string, name string, media []string, s3Key string) {

	fmt.Println("Creating file node for", name)

	result, err := neo4j.ExecuteQuery(ctx, driver,
		"MATCH (d:Directory {name: $prev}) "+
			"MERGE (d)-[:CONTAINS]->(f:File {name: $name, s3key: $key}) "+
			"RETURN f",
		map[string]any{
			"prev": prev,
			"name": name,
			"key":  s3Key,
		}, neo4j.EagerResultTransformer,
		neo4j.ExecuteQueryWithDatabase("neo4j"))
	if err != nil {
		panic(err)
	}

	// media nodes should be added and linked here!
	if len(media) > 0 {
		for _, fm := range media {
			path, _ := splitPathAndFilename(s3Key)

			mediaName := fm
			index := strings.LastIndex(fm, "/")
			if index != -1 {
				mediaName = fm[index+1:]
			}
			fullPath := path + "\\media\\" + mediaName
			matchCreateMediaNode(name, mediaName, fullPath)
		}
	}

	fmt.Printf("Created %v nodes in %+v.\n", len(result.Records),
		result.Summary.ResultAvailableAfter())

}

// create media nodes and link to associated file node
func matchCreateMediaNode(parentName string, media string, s3key string) {

	// TODO upload to s3, and use key as neo4j property

	fmt.Println("Creating media node for", parentName)

	result, err := neo4j.ExecuteQuery(ctx, driver,
		"MATCH (f:File {name: $name}) "+
			"MERGE (f)-[:LINKED]->(i:Media {name: $media, s3key: $s3key}) "+
			"RETURN i",
		map[string]any{
			"name":  parentName,
			"media": media,
			"s3key": s3key,
		}, neo4j.EagerResultTransformer,
		neo4j.ExecuteQueryWithDatabase("neo4j"))
	if err != nil {
		panic(err)
	}

	fmt.Printf("Created %v nodes in %+v.\n", len(result.Records),
		result.Summary.ResultAvailableAfter())

}
