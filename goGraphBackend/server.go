package main

import (
	"context"
	"fmt"
	"net/http"

	"os"

	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

var allowS3Upload = false // used in bulk upload to skip s3 upload
var driver neo4j.DriverWithContext
var ctx context.Context
var svc *s3.S3

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
	ctx = context.Background()
	err := godotenv.Load("Neo4jCreds.txt")
	if err != nil {
		panic(err)
	}
	dbUri := os.Getenv("NEO4J_URI")
	dbUser := os.Getenv("NEO4J_USERNAME")
	dbPassword := os.Getenv("NEO4J_PASSWORD")

	neo4jDriver, err := neo4j.NewDriverWithContext(
		dbUri,
		neo4j.BasicAuth(dbUser, dbPassword, ""))
	if err != nil {
		panic(err)
	}
	defer neo4jDriver.Close(ctx)

	err = neo4jDriver.VerifyConnectivity(ctx)
	if err != nil {
		panic(err)
	}
	driver = neo4jDriver
	fmt.Println("neo4j Connection established.")

	// set up s3 connection
	svc = establishS3Connection()

	// set up endpoints
	r := mux.NewRouter()
	r.HandleFunc("/api/getfile/{fileName}", serveFile)
	r.HandleFunc("/api/hierarchy/{dirName}", serveHierarchy)

	err = http.ListenAndServe(":8080", r)
	if err != nil {
		panic(err)
	}

	// these lines reset the Aura database to a clean slate
	// TODO: make optional on boot?
	//clearDB(driver, ctx)
	//createRootDirectory(driver, ctx)

	// testing neo4j and s3
	//bulkUploadNotes(svc, driver, ctx, "D:\\Notes Pruned")
	//fmt.Println("*************************************")

	//fmt.Println("*************************************")
	//listObjectsinS3(svc)

	// enter waiting loop, make endpoints available

	// on action, call appropriate function

	//uploadFileToS3()
	//testS3()
	// testQuery(ctx, driver)
}
