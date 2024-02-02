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

	// Enable CORS middleware
	corsMiddleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}

	// Attach the CORS middleware to the router
	r.Use(corsMiddleware)

	r.HandleFunc("/api/hierarchy/{dirName}", serveHierarchy)
	r.HandleFunc("/api/timelineHierarchy", serveTimelineHierarchy)

	r.HandleFunc("/api/upload/markdown/{parentFolder}", uploadMarkdownFile)

	r.HandleFunc("/api/serve/getImage/{parentFile}/{imageName}", serveImageFile)
	r.HandleFunc("/api/serve/getMarkdown/{parentFolder}/{fileName}", serveMarkdownFile)

	r.HandleFunc("/api/create/TimelineFolder/{parentFolder}/{childFolder}", createTLObject)
	r.HandleFunc("/api/delete/TimelineFolder/{parentFolder}/{childFolder}", deleteTLObject)

	err = http.ListenAndServe(":8080", r)
	if err != nil {
		panic(err)
	}
}
