package main

import (
	"context"
	"fmt"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func createNoteNode(driver neo4j.DriverWithContext, ctx context.Context) {

}

func listNodesinDB(driver neo4j.DriverWithContext, ctx context.Context) {

	result, err := neo4j.ExecuteQuery(ctx, driver,
		"MATCH (n:Person) RETURN n LIMIT 25;",
		nil, neo4j.EagerResultTransformer,
		neo4j.ExecuteQueryWithDatabase("neo4j"))
	if err != nil {
		panic(err)
	}

	fmt.Printf("The query `%v` returned %v records in %+v.\n",
		result.Summary.Query().Text(), len(result.Records),
		result.Summary.ResultAvailableAfter())
}
