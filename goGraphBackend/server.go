package main

import (
	"context"
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

var allowS3Upload = false

/*
	todo
		handle returning data at enpoints
		- endpoint for timeline
		- endpoint for individual notes
		- endpoints for list of timelines
		- endpoints for list of notes (queryable by connect notes)
*/

func main() {

	// set up neo4j driver
	ctx := context.Background()
	err := godotenv.Load("Neo4jCreds.txt")
	if err != nil {
		panic(err)
	}
	dbUri := os.Getenv("NEO4J_URI")
	dbUser := os.Getenv("NEO4J_USERNAME")
	dbPassword := os.Getenv("NEO4J_PASSWORD")

	driver, err := neo4j.NewDriverWithContext(
		dbUri,
		neo4j.BasicAuth(dbUser, dbPassword, ""))
	if err != nil {
		panic(err)
	}
	defer driver.Close(ctx)

	err = driver.VerifyConnectivity(ctx)
	if err != nil {
		panic(err)
	}
	fmt.Println("neo4j Connection established.")

	// set up s3 connection
	svc := establishS3Connection()

	// these lines reset the Aura database to a clean slate
	// TODO: make optional on boot?
	//clearDB(driver, ctx)
	//createRootDirectory(driver, ctx)

	// testing neo4j and s3
	//bulkUploadNotes(svc, driver, ctx, "D:\\Notes Pruned")
	fmt.Println("*************************************")
	getFile(svc, driver, ctx, "European History Timeline.md")
	fmt.Println("*************************************")
	//listObjectsinS3(svc)

	// enter waiting loop, make endpoints available

	// on action, call appropriate function

	//uploadFileToS3()
	//testS3()
	// testQuery(ctx, driver)
}
