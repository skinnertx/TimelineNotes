package main

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

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
