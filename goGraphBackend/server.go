package main

import (
	"context"
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func bulkUploadNotes() {

	// TODO
	// 	- get list of files in directory
	// 	- for each file, break into path and filename
	//  - upload to s3
	//  - upload to neo4j with metadata (links) defined

}

func uploadFileToS3() {

	// Specify your AWS region
	//awsRegion := "us-east-1"

	// Create an AWS session
	/*
		sess, err := session.NewSession(&aws.Config{
			Region: aws.String(awsRegion),
		})
		if err != nil {
			fmt.Println("Error creating session:", err)
			return
		}
	*/

	// Create an S3 client
	//s3Client := s3.New(sess)

	// Specify the bucket name and file to upload
	//bucketName := "timeline-notes-bucket"
	directoryPath := "D:\\Notes"

	fileList, err := getFilesInDirectory(directoryPath)
	if err != nil {
		fmt.Println("Error uploading file:", err)
		return
	}
	fmt.Println(fileList)

	/*
		// Specify the key (object key) for the file in the bucket
		key := "your-prefix/" + "file.txt"

		// Upload the file to the S3 bucket
		_, err = s3Client.PutObject(&s3.PutObjectInput{
			Bucket: aws.String(bucketName),
			Key:    aws.String(key),
			Body:   file,
		})
		if err != nil {
			fmt.Println("Error uploading file:", err)
			return
		}

		fmt.Println("File uploaded successfully!")
	*/

}

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
	svc := estavlishS3Connection()

	// testing neo4j
	listNodesinDB(driver, ctx)
	listObjectsinS3(svc)

	// enter waiting loop, make endpoints available

	// on action, call appropriate function

	//uploadFileToS3()
	//testS3()
	// testQuery(ctx, driver)
}
