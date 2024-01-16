package main

import (
	"context"
	"fmt"
	"os"
	"regexp"
	"strings"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
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

	Utility Functions

******************************************************************
*/
func listNodesinDB(driver neo4j.DriverWithContext, ctx context.Context) {

	result, err := neo4j.ExecuteQuery(ctx, driver,
		"MATCH (n) RETURN n LIMIT 25;",
		nil, neo4j.EagerResultTransformer,
		neo4j.ExecuteQueryWithDatabase("neo4j"))
	if err != nil {
		panic(err)
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
// specific function for uploading hierarchical notes from windows folder
// NOTE: root should already exist somewhere in the database before this is called
// need a place for all heirarchical notes to be linked back to in file tree
func bulkUploadNotes(driver neo4j.DriverWithContext, ctx context.Context, dirPath string) {

	// get list of files in directory
	fileList, err := getFilesInDirectory(dirPath)
	if err != nil {
		fmt.Println("Error walking directory:", err)
		return
	}

	for _, file := range fileList {

		// parse markdown file for media
		media, err := getImagesFromMarkdownFile(file)
		if err != nil {
			fmt.Println("Error parsing markdown file for media:", err)
		}

		// split path and filename for node creation
		path, fname := splitPathAndFilename(file)

		dirPaths := strings.Split(path, "\\")
		prev := "root"
		// loop through directory paths and create nodes if not existing
		for _, dir := range dirPaths {
			matchCreateDirNode(driver, ctx, prev, dir)
			prev = dir
		}

		// create file node linked to final directory node
		// also create media nodes and link to file node
		matchCreateFileNode(driver, ctx, prev, fname, media)
	}

	// TODO
	//  - sync upload to s3, and give nodes s3 keys

}

// create media nodes and link to associated file node
func matchCreateMediaNode(driver neo4j.DriverWithContext, ctx context.Context, name string, media string) {

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

// create file node and link to associated directory node
func matchCreateFileNode(driver neo4j.DriverWithContext, ctx context.Context,
	prev string, name string, media []string) {

	fmt.Println("Creating file node for", name)

	result, err := neo4j.ExecuteQuery(ctx, driver,
		"MATCH (d:Directory {name: $prev}) "+
			"MERGE (d)-[:CONTAINS]->(f:File {name: $name}) "+
			"RETURN f",
		map[string]any{
			"prev": prev,
			"name": name,
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
