package main

import (
	"context"
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

/*
******************************************************************

	FUNCTIONS THAT USE S3 AND NEO4J

******************************************************************
*/
func getFile(svc *s3.S3, driver neo4j.DriverWithContext, ctx context.Context, name string) (string, error) {
	fName, err := getS3KeyFromName(driver, ctx, name)
	if err != nil {
		return "", err
	}
	err = downloadObjectFromS3(svc, fName)
	if err != nil {
		return "", err
	}

	return "", nil
}

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
	if allowS3Upload {
		for i := 0; i < len(fileList); i++ {
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
	// loop thru all "media" nodes and link to file nodes
}
