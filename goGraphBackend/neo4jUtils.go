package main

import (
	"context"
	"fmt"
	"strings"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

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

func bulkUploadNotes(driver neo4j.DriverWithContext, ctx context.Context, dirPath string) {

	fileList, err := getFilesInDirectory(dirPath)
	if err != nil {
		fmt.Println("Error walking directory:", err)
		return
	}

	for _, file := range fileList {
		path, fname := splitPathAndFilename(file)

		dirPaths := strings.Split(path, "\\")
		prev := "root"
		for _, dir := range dirPaths {
			matchCreateDirNode(driver, ctx, prev, dir)
			prev = dir
		}
		matchCreateFileNode(driver, ctx, prev, fname)
		// Rest of the code
	}

	// TODO
	// 	- get list of files in directory
	// 	- for each file, break into path and filename
	//  - upload to s3
	//  - upload to neo4j with metadata (links) defined

}

func matchCreateFileNode(driver neo4j.DriverWithContext, ctx context.Context, prev string, name string) {
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

	fmt.Printf("Created %v nodes in %+v.\n", len(result.Records),
		result.Summary.ResultAvailableAfter())

}

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

func mergeDirNode(driver neo4j.DriverWithContext, ctx context.Context, name string) {
	result, err := neo4j.ExecuteQuery(ctx, driver,
		"MERGE (d:Directory {name: $name}) RETURN d",
		map[string]any{
			"name": name,
		}, neo4j.EagerResultTransformer,
		neo4j.ExecuteQueryWithDatabase("neo4j"))
	if err != nil {
		panic(err)
	}

	fmt.Printf("Created %v nodes in %+v.\n", len(result.Records),
		result.Summary.ResultAvailableAfter())
}

func createDirNode(driver neo4j.DriverWithContext, ctx context.Context) {
	result, err := neo4j.ExecuteQuery(ctx, driver,
		"CREATE (d:Directory {name: $name}) RETURN d",
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
