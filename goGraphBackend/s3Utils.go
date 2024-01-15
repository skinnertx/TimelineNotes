package main

import (
	"fmt"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
)

func estavlishS3Connection() *s3.S3 {
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

	/*
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
	*/
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
