package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/mux"
)

/*
******************************************************************

	JWT TOKEN OPERATIONS

******************************************************************
*/
type User struct {
	Username string `json:"username"`
}

type Credentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type TokenResponse struct {
	Token string `json:"token"`
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var creds Credentials
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	fmt.Printf("Received login request: %+v\n", creds)

	if creds.Username != adminUser || creds.Password != adminPass {
		http.Error(w, "Invalid username or password", http.StatusUnauthorized)
		fmt.Println("invalid user/pass")
		return
	}

	token := jwt.New(jwt.SigningMethodHS256)

	claims := token.Claims.(jwt.MapClaims)
	claims["username"] = creds.Username
	claims["exp"] = time.Now().Add(time.Hour * 12).Unix()

	tokenString, err := token.SignedString(jwtSecretKey)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	// Create a TokenResponse struct
	response := TokenResponse{Token: tokenString}

	// Encode the response struct as JSON
	jsonResponse, err := json.Marshal(response)
	if err != nil {
		http.Error(w, "Failed to encode JSON response", http.StatusInternalServerError)
		return
	}

	fmt.Println(tokenString)

	// Set the Content-Type header
	w.Header().Set("Content-Type", "application/json")

	// Write the JSON response to the response writer
	w.WriteHeader(http.StatusOK)
	w.Write(jsonResponse)
}

func isAuth(r *http.Request) (bool, error) {

	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return false, fmt.Errorf("empty token")
	}

	tokenString := strings.Replace(authHeader, "Bearer ", "", 1)

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Check the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		// Replace "secret" with your actual JWT secret key
		return jwtSecretKey, nil
	})

	if err != nil || !token.Valid {
		return false, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return false, fmt.Errorf("Failed to get token claims")
	}

	expirationTime := time.Unix(int64(claims["exp"].(float64)), 0)
	if time.Now().After(expirationTime) {
		return false, fmt.Errorf("Token expired")
	}

	return true, nil
}

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

func createMarkdownFile(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	parent := vars["parentFolder"]

	auth, err := isAuth(r)
	if !auth {
		errString := "Unauthorized" + err.Error()
		http.Error(w, errString, http.StatusUnauthorized)
		return
	}

	err = r.ParseMultipartForm(10 << 20) // 10 MB
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
	fmt.Println("creating ", fileName, " in ", parent)

	s3key, err := generateS3Key(parent, fileName)
	if err != nil {
		fmt.Println("Error generating s3Key", err)
	}

	err = uploadMarkdownToS3(file, s3key)
	if err != nil {
		fmt.Println("Error uploading file to S3:", err)
		return
	}

	err = matchCreateFile(parent, fileName, s3key)
	if err != nil {
		fmt.Println("Error uploading file to neo4j:", err)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Printf("File %s uploaded successfully!\n", fileName)
}

// function used to upload a makrdown folder on save press
func saveMarkdownFile(w http.ResponseWriter, r *http.Request) {

	vars := mux.Vars(r)
	parent := vars["parentFolder"]

	auth, err := isAuth(r)
	if !auth {
		errString := "Unauthorized" + err.Error()
		http.Error(w, errString, http.StatusUnauthorized)
		return
	}

	err = r.ParseMultipartForm(10 << 20) // 10 MB
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

	// update timeline links in neo4j
	err = updateTimelines(parent, fileName, file)
	if err != nil {
		// Handle the error
		fmt.Println("got error updating timelines")
		errorMessage := "Failed to update timelines: " + err.Error()

		// Encode the error message into JSON
		errorResponse := map[string]string{"error": errorMessage}
		jsonResponse, _ := json.Marshal(errorResponse)

		// Send the JSON response with the error message
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write(jsonResponse)
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
func createFolderObject(w http.ResponseWriter, r *http.Request) {

	vars := mux.Vars(r)
	parent := vars["parentFolder"]
	child := vars["childFolder"]

	auth, err := isAuth(r)
	if !auth {
		errString := "Unauthorized" + err.Error()
		http.Error(w, errString, http.StatusUnauthorized)
		return
	}

	fmt.Printf("creating %s/%s\n", parent, child)

	if strings.Contains(child, ".md") {

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

	auth, err := isAuth(r)
	if !auth {
		errString := "Unauthorized" + err.Error()
		http.Error(w, errString, http.StatusUnauthorized)
		return
	}

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

	auth, err := isAuth(r)
	if !auth {
		errString := "Unauthorized" + err.Error()
		http.Error(w, errString, http.StatusUnauthorized)
		return
	}

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

	auth, err := isAuth(r)
	if !auth {
		errString := "Unauthorized" + err.Error()
		http.Error(w, errString, http.StatusUnauthorized)
		return
	}

	err = removeTimelineObject(parent, child)
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

func serveTimeline(w http.ResponseWriter, r *http.Request) {

	vars := mux.Vars(r)
	timelineName := vars["timelineName"]

	fmt.Println("serving: ", timelineName)

	timelineContents, err := getTimelineContents(timelineName)
	if timelineContents.TimelineName == "" {
		// Handle the error
		fmt.Printf("time line of name %s was not found\n", timelineName)
		err = fmt.Errorf("could not find timeline %s", timelineName)
		errorMessage := err.Error()

		// Encode the error message into JSON
		errorResponse := map[string]string{"error": errorMessage}
		jsonResponse, _ := json.Marshal(errorResponse)

		// Send the JSON response with the error message
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write(jsonResponse)
		return
	}

	if err != nil {
		// Handle the error
		fmt.Println("got error searching for timeline")
		errorMessage := err.Error()

		// Encode the error message into JSON
		errorResponse := map[string]string{"error": errorMessage}
		jsonResponse, _ := json.Marshal(errorResponse)

		// Send the JSON response with the error message
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write(jsonResponse)
		return
	}

	jsonData, err := json.Marshal(timelineContents)
	w.Write(jsonData)
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
