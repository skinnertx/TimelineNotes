package main

import (
	"fmt"
	"os"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
)

var bucketName = "timeline-notes-bucket"

func establishS3Connection() *s3.S3 {
	// Specify your AWS region
	awsRegion := "us-east-1"

	// Create an AWS session
	sess, err := session.NewSession(&aws.Config{
		Region: aws.String(awsRegion),
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

func uploadObjectToS3(svc *s3.S3, fName string) error {

	// Open the file for use
	file, err := os.Open(fName)
	defer file.Close()
	if err != nil {
		fmt.Println("Error opening file:", err)
		return err
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

func listObjectsinS3(svc *s3.S3) {
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
