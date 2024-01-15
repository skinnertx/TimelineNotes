package main

import (
	"context"
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func establishNeo4jConnection() (context.Context, neo4j.DriverWithContext) {
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

	return ctx, driver
}

func listNodesinDB(ctx context.Context, driver neo4j.DriverWithContext) {
	result, err := neo4j.ExecuteQuery(ctx, driver,
		"MATCH (n) RETURN n",
		nil, neo4j.EagerResultTransformer,
		neo4j.ExecuteQueryWithDatabase("neo4j"))
	if err != nil {
		panic(err)
	}

	fmt.Println("Nodes in neo4j DB:")
	fmt.Printf("Found %v nodes in %+v.\n",
		result.Summary.Counters().NodesCreated(),
		result.Summary.ResultAvailableAfter())
}
