package main

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/joho/godotenv"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

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

// specific function for uploading hierarchical notes from windows folder
// NOTE: root should already exist somewhere in the database before this is called
// need a place for all heirarchical notes to be linked back to in file tree
func bulkUploadNotes(svc *s3.S3, driver neo4j.DriverWithContext, ctx context.Context, dirPath string) {

	// get list of files in directory
	// NOTE: files in fileList are full paths
	fileList, err := getFilesInDirectory(dirPath)
	if err != nil {
		fmt.Println("Error walking directory:", err)
		return
	}

	// use files full path to upload to s3, if there is an error, skip file/remove
	// from list
	// loop through file list
	for i := len(fileList); i < len(fileList); i++ {
		file := fileList[i]

		// upload file to s3
		err := uploadObjectToS3(svc, file)
		// if err
		if err != nil {
			// remove from list
			fileList = append(fileList[:i], fileList[i+1:]...)
			i-- // update index to account for removed element
		}
	}

	// anything remaining in file list should be uploaded to s3, need to map to neo4j
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
		matchCreateFileNode(driver, ctx, prev, fname, media, file)
	}

	// TODO
	//  - sync upload to s3, and give nodes s3 keys

}

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
	clearDB(driver, ctx)
	createRootDirectory(driver, ctx)

	// testing neo4j
	bulkUploadNotes(svc, driver, ctx, "D:\\Notes Pruned")

	// enter waiting loop, make endpoints available

	// on action, call appropriate function

	//uploadFileToS3()
	//testS3()
	// testQuery(ctx, driver)
}
