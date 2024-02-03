package main

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/s3"
)

// ==============================================
// There are functions used for initial set up
// and testing of backend features
// Meant for manual use!!!!
// ==============================================

func removeDriveLetter(filePath string) string {
	re := regexp.MustCompile(`^[A-Za-z]:\\`)
	return re.ReplaceAllString(filePath, "")
}

func splitPathAndFilename(filePath string) (string, string) {
	index := strings.LastIndex(filePath, "\\")
	if index == -1 {
		return "", filePath
	}
	path := filePath[:index]
	filename := filePath[index+1:]
	return path, filename
}

func getFilesInDirectory(directoryPath string) ([]string, error) {
	var fileList []string

	err := filepath.Walk(directoryPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip directories
		if info.IsDir() {
			return nil
		}

		// Add file path to the list

		fileList = append(fileList, path)

		return nil
	})

	if err != nil {
		return nil, err
	}

	return fileList, nil
}

func uploadObjectToS3(fName string, chopDrive bool) error {

	// Open the file for use
	file, err := os.Open(fName)
	defer file.Close()
	if err != nil {
		fmt.Println("Error opening file:", err)
		return err
	}

	// hacky fix to remove drive letter from file path for windows machines
	if chopDrive {
		fName = removeDriveLetter(fName)
	}

	// Upload the file to the S3 bucket
	_, err = svc.PutObject(&s3.PutObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(fName),
		Body:   file,
	})
	if err != nil {
		fmt.Println("Error uploading file:", err)
		return err
	}

	fmt.Println("File uploaded successfully!")
	return nil
}

// specific function for uploading hierarchical notes from windows folder
// NOTE: root should already exist somewhere in the database before this is called
// need a place for all heirarchical notes to be linked back to in file tree
func bulkUploadNotes(dirPath string, chopDrive bool) {

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
			err := uploadObjectToS3(file, chopDrive)
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

		if !strings.Contains(file, ".md") {
			continue
		}

		// parse markdown file for media
		media, err := getImagesFromMarkdownFile(file)
		if err != nil {
			fmt.Println("Error parsing markdown file for media:", err)
		}

		// TODO: make this less hacky and more maintainable
		// there are multiple places where the drive letter is removed from the file path
		// and its annoying to keep track of
		if chopDrive {
			file = removeDriveLetter(file)
		}

		// split path and filename for node creation
		path, fname := splitPathAndFilename(file)

		// TODO: potential edge case of uploading a drive
		// thus with chop drive path is just ""? need to test
		// but this function likely wont make it to prod so not a big deal

		dirPaths := strings.Split(path, "\\")
		prev := "root"
		// loop through directory paths and create nodes if not existing
		for _, dir := range dirPaths {
			matchCreateDirNode(prev, dir)
			prev = dir
		}

		// create file node linked to final directory node
		// also create media nodes and link to file node
		matchCreateFileNode(prev, fname, media, file)
	}

	// TODO
	// loop thru all "media" nodes and link to file nodes
}

// create directory node and link to parent directory node
func matchCreateDirNode(parent string, child string) {
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

// create file node and link to associated directory node
func matchCreateFileNode(prev string, name string, media []string, s3Key string) {

	fmt.Println("Creating file node for", name)

	result, err := neo4j.ExecuteQuery(ctx, driver,
		"MATCH (d:Directory {name: $prev}) "+
			"MERGE (d)-[:CONTAINS]->(f:File {name: $name, s3key: $key}) "+
			"RETURN f",
		map[string]any{
			"prev": prev,
			"name": name,
			"key":  s3Key,
		}, neo4j.EagerResultTransformer,
		neo4j.ExecuteQueryWithDatabase("neo4j"))
	if err != nil {
		panic(err)
	}

	// media nodes should be added and linked here!
	if len(media) > 0 {
		for _, fm := range media {
			path, _ := splitPathAndFilename(s3Key)

			mediaName := fm
			index := strings.LastIndex(fm, "/")
			if index != -1 {
				mediaName = fm[index+1:]
			}
			fullPath := path + "\\media\\" + mediaName
			matchCreateMediaNode(name, mediaName, fullPath)
		}
	}

	fmt.Printf("Created %v nodes in %+v.\n", len(result.Records),
		result.Summary.ResultAvailableAfter())

}

// create media nodes and link to associated file node
func matchCreateMediaNode(parentName string, media string, s3key string) {

	// TODO upload to s3, and use key as neo4j property

	fmt.Println("Creating media node for", parentName)

	result, err := neo4j.ExecuteQuery(ctx, driver,
		"MATCH (f:File {name: $name}) "+
			"MERGE (f)-[:LINKED]->(i:Media {name: $media, s3key: $s3key}) "+
			"RETURN i",
		map[string]any{
			"name":  parentName,
			"media": media,
			"s3key": s3key,
		}, neo4j.EagerResultTransformer,
		neo4j.ExecuteQueryWithDatabase("neo4j"))
	if err != nil {
		panic(err)
	}

	fmt.Printf("Created %v nodes in %+v.\n", len(result.Records),
		result.Summary.ResultAvailableAfter())

}
