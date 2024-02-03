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

// util function for fetching both timeline and folder view hierarchies
func getHierarchy(parent *Neo4jNode, isTimeline bool) error {
	children, err := getContainedNodes(parent.Name, isTimeline)
	if err != nil {
		return err
	}

	for _, child := range children {
		parent.Children = append(parent.Children, &Neo4jNode{Name: child})
		if !strings.Contains(child, ".") {
			err = getHierarchy(parent.Children[len(parent.Children)-1], isTimeline)
			if err != nil {
				return err
			}
		}
	}

	return nil
}

// function used to upload a makrdown folder on save press
// TODO: should this be renamed to something like saveMarkdown?
func uploadMarkdownFile(w http.ResponseWriter, r *http.Request) {

	vars := mux.Vars(r)
	parent := vars["parentFolder"]

	err := r.ParseMultipartForm(10 << 20) // 10 MB
	if err != nil {
		fmt.Println("Error parsing multipart form:", err)
		return
	}

	file, fileHeader, err := r.FormFile("file")
	if err != nil {
		fmt.Println("Error retrieving file from form:", err)
		return
	}
	defer file.Close()

	fileName := fileHeader.Filename
	fmt.Println("Uploaded filename:", fileName)

	s3key, err := getMarkdowns3Key(parent, fileName)

	err = uploadMarkdownToS3(file, s3key)
	if err != nil {
		fmt.Println("Error uploading file to S3:", err)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Printf("File %s uploaded successfully!\n", fileName)
}

// serve a json with the timeline hierarchy to endpoint
func serveTimelineHierarchy(w http.ResponseWriter, r *http.Request) {
	tlroot := &Neo4jNode{Name: "tlroot"}
	err := getHierarchy(tlroot, true)
	if err != nil {
		fmt.Println("Error getting timeline hierarchy:", err)
	}

	jsonData, err := json.Marshal(tlroot)
	if err != nil {
		fmt.Println("Error marshalling json:", err)
	}

	w.Write(jsonData)

}

// serve json with folder structure to endpoint
func serveHierarchy(w http.ResponseWriter, r *http.Request) {

	vars := mux.Vars(r)
	dirName := vars["dirName"]
	if dirName == "" {
		dirName = "root"
	}
	root := &Neo4jNode{Name: dirName}
	err := getHierarchy(root, false)
	if err != nil {
		fmt.Println("Error getting hierarchy:", err)
	}
	jsonData, err := json.Marshal(root)
	if err != nil {
		fmt.Println("Error marshalling json:", err)
	}

	// Set appropriate headers
	// w.Header().Set("Access-Control-Allow-Origin", "*")
	// w.Header().Set("Access-Control-Allow-Methods", "GET")
	// w.Header().Set("Content-Type", "application/json")

	// Write the file content as the response
	w.Write(jsonData)
}

// create a folder object with the given names
// TODO add file compatibility
func createFolderObject(w http.ResponseWriter, r *http.Request) {

	vars := mux.Vars(r)
	parent := vars["parentFolder"]
	child := vars["childFolder"]

	fmt.Printf("creating %s/%s\n", parent, child)

	if strings.Contains(child, ".md") {

		// TODO add logic to upload a new file to s3
		// and add to neo4j
		fmt.Println("WIP adding a file")

	} else {
		err := matchCreateFolder(parent, child)
		if err != nil {
			fmt.Println(err)
			http.Error(w, "Failed to create node", http.StatusInternalServerError)
			return
		}
	}

	fmt.Println("success creating TLObject")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Node created successfully"))

}

// add a timeline object to neo4j
func createTLObject(w http.ResponseWriter, r *http.Request) {

	vars := mux.Vars(r)
	parent := vars["parentFolder"]
	child := vars["childFolder"]

	fmt.Printf("creating %s/%s\n", parent, child)

	if strings.Contains(child, ".tl") {
		err := matchCreateTimeline(parent, child)
		if err != nil {
			fmt.Println(err)
			http.Error(w, "Failed to create node", http.StatusInternalServerError)
			return
		}

	} else {
		err := matchCreateTimelineFolder(parent, child)
		if err != nil {
			fmt.Println(err)
			http.Error(w, "Failed to create node", http.StatusInternalServerError)
			return
		}
	}

	fmt.Println("success creating TLObject")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Node created successfully"))
}

// delete a folder object from the md hierarchy
// TODO allow file deletion
func deleteFolderObject(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	parent := vars["parentFolder"]
	child := vars["childFolder"]

	if strings.Contains(child, ".md") {
		// delete file

		// TODO add logic to delete a file from neo4j and s3
		fmt.Println("file deletion is WIP")

	} else {
		// delete folder
		err := removeFolder(parent, child)
		if err != nil {
			fmt.Println(err)
			http.Error(w, "Failed to remove node", http.StatusInternalServerError)
			return
		}
	}

	fmt.Println("success removing TL object")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Node removed successfully"))

}

// delete a timeline object from the timeline hierarchy
func deleteTLObject(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	parent := vars["parentFolder"]
	child := vars["childFolder"]

	err := removeTimelineObject(parent, child)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Failed to remove node", http.StatusInternalServerError)
		return
	}

	fmt.Println("success removing TL object")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Node removed successfully"))
}

// serve an image file
func serveImageFile(w http.ResponseWriter, r *http.Request) {

	vars := mux.Vars(r)
	parentFile := vars["parentFile"]
	imageName := vars["imageName"]

	s3ObjectKey, err := getS3KeyForImage(parentFile, imageName)
	if err != nil {
		fmt.Println("Error getting s3 key from name:", err)
		return
	}
	fmt.Println("found s3ObjectKey:", s3ObjectKey)

	// Write the file content as the response
	fileContents, err := getFileContents(s3ObjectKey)
	if err != nil {
		fmt.Println("Error getting file contents:", err)
		return
	}
	w.Write(fileContents)
}

// serve a markdown file
func serveMarkdownFile(w http.ResponseWriter, r *http.Request) {

	vars := mux.Vars(r)
	parent := vars["parentFolder"]
	fileName := vars["fileName"]

	s3Key, err := getMarkdowns3Key(parent, fileName)

	// Write the file content as the response
	fileContents, err := getFileContents(s3Key)
	if err != nil {
		fmt.Println("Error getting file contents:", err)
		return
	}
	w.Write(fileContents)

}
