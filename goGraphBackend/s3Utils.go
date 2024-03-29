package main

import (
	"fmt"
	"io"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
)

var bucketName = "timeline-notes-bucket"

func establishS3Connection(creds *credentials.Credentials) *s3.S3 {
	// Specify your AWS region
	awsRegion := "us-east-1"

	// Create an AWS session
	sess, err := session.NewSession(&aws.Config{
		Region:      aws.String(awsRegion),
		Credentials: creds,
	})
	if err != nil {
		fmt.Println("Error creating session:", err)
		return nil
	}

	// Create an S3 client
	svc := s3.New(sess)
	fmt.Println("s3 Connection established.")

	return svc
}

func removeS3File(s3key string) error {

	input := &s3.DeleteObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(s3key),
	}

	// Perform the DeleteObject operation
	_, err := svc.DeleteObject(input)
	if err != nil {
		return fmt.Errorf("error deleting object:")
	}

	fmt.Println("Object deleted successfully.")
	return nil
}

func uploadMarkdownToS3(file io.ReadSeeker, s3key string) error {

	_, err := svc.PutObject(&s3.PutObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(s3key),
		Body:   file,
	})

	if err != nil {
		fmt.Println("Error uploading file:", err)
		return err
	}

	fmt.Println("File uploaded successfully!")
	return nil
}

func getFileContents(key string) ([]byte, error) {
	// Create the S3 Object input
	obj := &s3.GetObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(key),
	}

	// Get the object
	resp, err := svc.GetObject(obj)
	if err != nil {
		fmt.Println("Error getting object:", err)
		return nil, err
	}

	// Read the response body into a byte slice
	bs, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Error reading file:", err)
		return nil, err
	}

	return bs, nil
}

func clearBucket() error {

	// List objects in the bucket
	resp, err := svc.ListObjectsV2(&s3.ListObjectsV2Input{Bucket: aws.String(bucketName)})
	if err != nil {
		fmt.Println("Error listing objects:", err)
		return err
	}

	// Delete each object in the bucket
	for _, obj := range resp.Contents {
		_, err := svc.DeleteObject(&s3.DeleteObjectInput{
			Bucket: aws.String(bucketName),
			Key:    obj.Key,
		})
		if err != nil {
			fmt.Println("Error deleting object:", err)
			return err
		}
	}

	fmt.Println("Bucket cleared successfully!")
	return nil
}

func listObjectsinS3() {
	// Specify your bucket name
	bucketName := "timeline-notes-bucket"

	// Example: List objects in the bucket
	resp, err := svc.ListObjectsV2(&s3.ListObjectsV2Input{Bucket: aws.String(bucketName)})
	if err != nil {
		fmt.Println("Error listing objects:", err)
		return
	}

	// Print object names
	for _, obj := range resp.Contents {
		fmt.Println("Object:", *obj.Key)
	}
}
