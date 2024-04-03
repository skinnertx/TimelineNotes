package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

var allowS3Upload = false // used in bulk upload to skip s3 upload
var driver neo4j.DriverWithContext
var ctx context.Context
var svc *s3.S3
var jwtSecretKey []byte

// TODO: set up real user storage
var adminUser string
var adminPass string

func setupRoutes(r *mux.Router) {
	// enable CORS middleware
	corsMiddleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			// // Only accept traffic from "dummyname.com"
			// allowedOrigin := "https://dummyname.com"
			// origin := r.Header.Get("Origin")
			// if origin != allowedOrigin {
			// 	http.Error(w, "Origin not allowed", http.StatusForbidden)
			// 	return
			// }

			// allowedOrigins := []string{"https://yourfrontenddomain.com", "https://your.ip.address"}

			// TODO change this to only accept real traffic, for now AWS is doing the heavy lifting
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, *")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}

	// Attach the CORS middleware to the router
	r.Use(corsMiddleware)

	r.HandleFunc("/api/hierarchy/{dirName}", serveHierarchy)
	r.HandleFunc("/api/timelineHierarchy", serveTimelineHierarchy)

	r.HandleFunc("/api/save/markdown/{parentFolder}", saveMarkdownFile)

	r.HandleFunc("/api/serve/getImage/{parentFile}/{imageName}", serveImageFile)
	r.HandleFunc("/api/serve/getMarkdown/{parentFolder}/{fileName}", serveMarkdownFile)
	r.HandleFunc("/api/serve/getTimeline/{timelineName}", serveTimeline)

	r.HandleFunc("/api/create/TimelineFolder/{parentFolder}/{childFolder}", createTLObject)
	r.HandleFunc("/api/create/Folder/{parentFolder}/{childFolder}", createFolderObject)
	r.HandleFunc("/api/create/MarkdownFile/{parentFolder}", createMarkdownFile)

	r.HandleFunc("/api/delete/TimelineFolder/{parentFolder}/{childFolder}", deleteTLObject)
	r.HandleFunc("/api/delete/Folder/{parentFolder}/{childFolder}", deleteFolderObject)

	r.HandleFunc("/api/login", handleLogin)
}

func main() {

	// THE FOLLOWING SHOULD BE IN ITS OWN FUNCTION
	// BUT DRIVER CANT BE DEFERRED TO CLOSE
	// set env vars
	ctx = context.Background()
	err := godotenv.Load("Neo4jCreds.txt")
	if err != nil {
		panic(err)
	}

	// load env vars
	dbUri := os.Getenv("NEO4J_URI")
	dbUser := os.Getenv("NEO4J_USERNAME")
	dbPassword := os.Getenv("NEO4J_PASSWORD")
	jwtSecretKeyString := os.Getenv("SECRET_KEY")
	s3AccessKey := os.Getenv("AWS_ACCESS_KEY")
	s3SecretKey := os.Getenv("AWS_SECRET_KEY")
	adminUser = os.Getenv("ADMIN_USER")
	adminPass = os.Getenv("ADMIN_PASS")

	// set up neo4j driver
	neo4jDriver, err := neo4j.NewDriverWithContext(
		dbUri,
		neo4j.BasicAuth(dbUser, dbPassword, ""))
	if err != nil {
		panic(err)
	}
	defer neo4jDriver.Close(ctx)

	err = neo4jDriver.VerifyConnectivity(ctx)
	if err != nil {
		panic(err)
	}
	driver = neo4jDriver
	fmt.Println("neo4j Connection established.")

	// set up s3 connection
	creds := credentials.NewStaticCredentials(s3AccessKey, s3SecretKey, "")
	svc = establishS3Connection(creds)

	// java web token authentication
	jwtSecretKey = []byte(jwtSecretKeyString)

	// set up endpoints
	r := mux.NewRouter()
	setupRoutes(r)

	srv := &http.Server{
		Addr:    ":443",
		Handler: r,
	}

	certFile := "/etc/letsencrypt/live/timelinenotes.org/cert.pem"
	keyFile := "/etc/letsencrypt/live/timelinenotes.org/privkey.pem"

	// Start the HTTP server in a Goroutine
	go func() {
		fmt.Println("Starting server on port 443")
		if err := srv.ListenAndServeTLS(certFile, keyFile); err != nil && err != http.ErrServerClosed {
			fmt.Println("ListenAndServeTLS error:", err)
		}
	}()

	// Listen for interrupt signal to gracefully shutdown the server
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	// Create a context with a timeout for graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Shutdown the HTTP server
	fmt.Println("Shutting down server...")
	if err := srv.Shutdown(ctx); err != nil {
		fmt.Println("Server shutdown error:", err)
	} else {
		fmt.Println("Server gracefully stopped")
	}

	// err = http.ListenAndServeTLS(":443", certFile, keyFile, r)
	// if err != nil {
	// 	panic(err)
	// }
}
