package main

import (
	"log"
	"net/http"
	"os"

	"boxy-ide/internal/terminal"
	"boxy-ide/internal/web"
)

func main() {
	apiH, uiH := web.Handlers()
	termH, err := terminal.New()
	if err != nil {
		log.Fatalf("failed to create terminal handler: %v", err)
	}

	mux := http.NewServeMux()
	mux.Handle("/api/", apiH)
	mux.Handle("/terminal", termH)
	mux.Handle("/", uiH)

	port := ":3000"
	if envPort := os.Getenv("PORT"); envPort != "" {
		port = ":" + envPort
	}
	log.Printf("Go IDE server listening %s", port)
	log.Fatal(http.ListenAndServe(port, mux))
}
