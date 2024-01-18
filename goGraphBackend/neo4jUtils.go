package main

import (
	"context"
	"fmt"
	"os"
	"regexp"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j/dbtype"
)

/*
******************************************************************

	DATABASE SETUP FUNCTIONS

******************************************************************
*/
func createRootDirectory(driver neo4j.DriverWithContext, ctx context.Context) {
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

func clearDB(driver neo4j.DriverWithContext, ctx context.Context) {

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

func getS3KeyFromName(name string) (string, error) {
	fmt.Printf("Getting s3 key for file: %s\n", name)
	if ctx == nil {
		fmt.Println("Context is nil")
		return "", fmt.Errorf("Context is nil")
	}
	if driver == nil {
		fmt.Println("Driver is nil")
	}
	session := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	fmt.Println("Executing Neo4j query...")

	result, err := session.Run(ctx,
		"MATCH (f:File {name: $name}) RETURN f.s3key",
		map[string]interface{}{
			"name": name,
		},
	)

	if err != nil {
		fmt.Println("Error executing Neo4j query:", err)
		return "", err
	}

	if result.Next(ctx) {
		s3key, exists := result.Record().Get("f.s3key")
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

func listFilesinDB(driver neo4j.DriverWithContext, ctx context.Context) {

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

func listNodesinDB(driver neo4j.DriverWithContext, ctx context.Context) {

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
func matchCreateDirNode(driver neo4j.DriverWithContext, ctx context.Context, parent string, child string) {
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
func matchCreateFileNode(driver neo4j.DriverWithContext, ctx context.Context,
	prev string, name string, media []string, s3Key string) {

	// TODO upload to s3, and use key as neo4j property

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
			matchCreateMediaNode(driver, ctx, name, fm)
		}
	}

	fmt.Printf("Created %v nodes in %+v.\n", len(result.Records),
		result.Summary.ResultAvailableAfter())

}

// create media nodes and link to associated file node
func matchCreateMediaNode(driver neo4j.DriverWithContext, ctx context.Context, name string, media string) {

	// TODO upload to s3, and use key as neo4j property

	fmt.Println("Creating media node for", name)

	result, err := neo4j.ExecuteQuery(ctx, driver,
		"MATCH (f:File {name: $name}) "+
			"MERGE (f)-[:LINKED]->(i:Media {name: $media}) "+
			"RETURN i",
		map[string]any{
			"name":  name,
			"media": media,
		}, neo4j.EagerResultTransformer,
		neo4j.ExecuteQueryWithDatabase("neo4j"))
	if err != nil {
		panic(err)
	}

	fmt.Printf("Created %v nodes in %+v.\n", len(result.Records),
		result.Summary.ResultAvailableAfter())

}
