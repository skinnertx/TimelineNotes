package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
)

/*
******************************************************************

	FUNCTIONS THAT USE S3 AND NEO4J

******************************************************************
*/
type Neo4jNode struct {
	Name     string       `json:"name"`
	Children []*Neo4jNode `json:"children,omitempty"`
}

func getHierarchy(parent *Neo4jNode) error {
	children, err := getContainedNodes(parent.Name)
	if err != nil {
		return err
	}

	for _, child := range children {
		parent.Children = append(parent.Children, &Neo4jNode{Name: child})
		if !strings.Contains(child, ".") {
			err = getHierarchy(parent.Children[len(parent.Children)-1])
			if err != nil {
				return err
			}
		}
	}

	return nil
}

func serveHierarchy(w http.ResponseWriter, r *http.Request) {

	vars := mux.Vars(r)
	dirName := vars["dirName"]
	if dirName == "" {
		dirName = "root"
	}
	root := &Neo4jNode{Name: dirName}
	err := getHierarchy(root)
	if err != nil {
		fmt.Println("Error getting hierarchy:", err)
	}
	jsonData, err := json.Marshal(root)
	if err != nil {
		fmt.Println("Error marshalling json:", err)
	}

	// Set appropriate headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET")
	w.Header().Set("Content-Type", "application/json")

	// Write the file content as the response
	w.Write(jsonData)
}

func serveImage(w http.ResponseWriter, r *http.Request) {

	vars := mux.Vars(r)
	s3Key := vars["imageName"]
	s3ObjectKey, err := getS3KeyFromName(s3Key)
	if err != nil {
		fmt.Println("Error getting s3 key from name:", err)
		return
	}
	fmt.Println("found s3ObjectKey:", s3ObjectKey)

	// Set appropriate headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET")
	w.Header().Set("Content-Type", "image/png")

	// Write the file content as the response
	fileContents, err := getFileContents(s3ObjectKey)
	if err != nil {
		fmt.Println("Error getting file contents:", err)
		return
	}
	w.Write(fileContents)
}

func serveFile(w http.ResponseWriter, r *http.Request) {

	// TODO return error in HTTP?

	vars := mux.Vars(r)
	s3Key := vars["fileName"]
	s3ObjectKey, err := getS3KeyFromName(s3Key)
	if err != nil {
		fmt.Println("Error getting s3 key from name:", err)
		return
	}
	fmt.Println("found s3ObjectKey:", s3ObjectKey)

	// Set appropriate headers

	// TODO: make this more secure
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET")
	w.Header().Set("Content-Type", "text/plain")

	// Write the file content as the response
	fileContents, err := getFileContents(s3ObjectKey)
	if err != nil {
		fmt.Println("Error getting file contents:", err)
		return
	}
	w.Write(fileContents)
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
