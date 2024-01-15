package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func testingFunc() {
	directoryPath := "D:\\Notes"

	fileList, err := getFilesInDirectory(directoryPath)
	for _, file := range fileList {
		path, fname := splitPathAndFilename(file)
		fmt.Println(path, " _ ", fname)
	}
	if err != nil {
		fmt.Println("Error uploading file:", err)
		return
	}
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
