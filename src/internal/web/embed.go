package web

import (
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"lite-ide/internal/vfs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/fsnotify/fsnotify"
)

//go:embed build/*
var uiFiles embed.FS

func stripBuildFS() http.FileSystem {
	sub, _ := fs.Sub(uiFiles, "build")
	return http.FS(sub)
}

func Handlers() (api http.Handler, web http.Handler) {
	// 1. REST API wrapper
	api = http.StripPrefix("/api", http.HandlerFunc(apiHandler))

	// 2. SPA catch-all – serve UI files from embedded filesystem at root
	web = http.FileServer(stripBuildFS())
	return
}

func apiHandler(w http.ResponseWriter, r *http.Request) {
	// CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Handle SSE endpoint for file watching
	if r.URL.Path == "/watch" && r.Method == "GET" {
		handleFileWatch(w, r)
		return
	}

	// Handle folder expansion for lazy loading
	if r.URL.Path == "/expand" && r.Method == "POST" {
		handleExpandFolder(w, r)
		return
	}

	// Handle file operations
	switch r.Method {
	case "GET":
		handleGet(w, r)
	case "POST":
		handlePost(w, r)
	case "PUT":
		handlePut(w, r)
	case "PATCH":
		handlePatch(w, r)
	case "DELETE":
		handleDelete(w, r)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleFileWatch(w http.ResponseWriter, r *http.Request) {
	// Set headers for SSE
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Get root path from query parameter or environment variable
	root := r.URL.Query().Get("root")
	if root == "" {
		root = os.Getenv("LITE_IDE_ROOT")
	}
	if root == "" {
		// Default to current directory, but check if it's too large
		cwd, err := os.Getwd()
		if err != nil {
			root = "."
		} else {
			// Check if current directory has too many subdirectories
			dirCount := 0
			filepath.Walk(cwd, func(path string, info os.FileInfo, err error) error {
				if err != nil {
					return nil
				}
				if info.IsDir() {
					dirCount++
					if dirCount > 1000 {
						return filepath.SkipDir
					}
				}
				return nil
			})
			
			if dirCount > 1000 {
				log.Printf("Warning: current directory has %d subdirectories, using project root instead", dirCount)
				// Use the project root directory instead
				root = "/home/noobi/Desktop/projects/lite-ide"
			} else {
				root = cwd
			}
		}
	}

	// Create file watcher
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		http.Error(w, "failed to create watcher", http.StatusInternalServerError)
		return
	}
	defer watcher.Close()

	// Add root directory and first 2 levels of subdirectories to watcher (lazy loading)
	log.Printf("DEBUG: Starting file watch setup for root: %s", root)
	
	// First, let's check what directories exist in the root
	entries, err := os.ReadDir(root)
	if err != nil {
		log.Printf("DEBUG: Cannot read root directory %s: %v", root, err)
	} else {
		log.Printf("DEBUG: Root directory %s contains %d entries:", root, len(entries))
		for _, entry := range entries {
			if entry.IsDir() {
				log.Printf("DEBUG:   Directory: %s", entry.Name())
			}
		}
	}
	
	err = addLazyWatch(watcher, root, 2)
	if err != nil {
		log.Printf("ERROR: addLazyWatch failed for root %s: %v", root, err)
		// Send error to client via SSE
		errorMsg := fmt.Sprintf("Failed to setup file watching for %s: %v", root, err)
		fmt.Fprintf(w, "event: error\ndata: %s\n\n", errorMsg)
		w.(http.Flusher).Flush()
		return
	}
	log.Printf("DEBUG: File watch setup completed successfully for root: %s", root)

	// Create a channel to signal client disconnection
	clientGone := r.Context().Done()

	// Send initial connection event
	fmt.Fprintf(w, "event: connected\ndata: connected\n\n")
	w.(http.Flusher).Flush()

	// Watch for events
	for {
		select {
		case <-clientGone:
			return
		case event, ok := <-watcher.Events:
			if !ok {
				return
			}

			// Skip temporary files and .git directory
			if strings.Contains(event.Name, ".git") || strings.HasSuffix(event.Name, "~") {
				continue
			}

			// Get updated tree and send it
			tree, err := vfs.GetTree(root)
			if err != nil {
				log.Printf("Failed to get tree after file change: %v", err)
				continue
			}

			treeData, _ := json.Marshal(tree)
			fmt.Fprintf(w, "data: %s\n\n", treeData)
			w.(http.Flusher).Flush()

			// If new directory created, add it to watch
			if event.Op&fsnotify.Create != 0 {
				if info, err := os.Stat(event.Name); err == nil && info.IsDir() {
					watcher.Add(event.Name)
				}
			}

		case err, ok := <-watcher.Errors:
			if !ok {
				return
			}
			log.Printf("Watcher error: %v", err)
		}
	}
}

func handleExpandFolder(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("content-type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Get root path from query parameter
	rootPath := r.URL.Query().Get("root")
	if rootPath == "" || rootPath == "." {
		if cwd, err := os.Getwd(); err == nil {
			rootPath = cwd
		} else {
			rootPath = "."
		}
	}

	// Parse request body
	var req struct {
		Path string `json:"path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Build full path
	fullPath := filepath.Join(rootPath, req.Path)
	
	// Create a temporary watcher to add the directory
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Printf("Failed to create temporary watcher for expansion: %v", err)
		http.Error(w, "failed to create watcher", http.StatusInternalServerError)
		return
	}
	defer watcher.Close()

	// Add the directory and its subdirectories to watch
	if err := addDirectoryWatch(watcher, fullPath); err != nil {
		log.Printf("Failed to add watch for expanded folder %s: %v", fullPath, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Return success response
	response := map[string]string{
		"status":  "success",
		"message": fmt.Sprintf("Folder expanded: %s", req.Path),
	}
	json.NewEncoder(w).Encode(response)
}

func addRecursiveWatch(watcher *fsnotify.Watcher, root string) error {
	// Track directories we've already processed to avoid duplicates
	processed := make(map[string]bool)
	maxWatches := 1000 // Limit to prevent hitting system limits
	watchCount := 0
	
	return filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip inaccessible files
		}
		
		if info.IsDir() {
			// Skip problematic directories that commonly cause watch limit issues
			base := filepath.Base(path)
			if shouldSkipDirectory(base) {
				return filepath.SkipDir
			}
			
			// Skip if we've already processed this directory
			if processed[path] {
				return nil
			}
			processed[path] = true
			
			// Limit the number of watches to prevent system limits
			if watchCount >= maxWatches {
				for i := 0; i < 1; i++ {
					log.Printf("Warning: reached maximum watch limit (%d), skipping remaining directories", maxWatches)
				}
				return filepath.SkipDir
			}
			
			// Add watch but don't fail on individual directory errors
			if err := watcher.Add(path); err != nil {
				// Log the error but continue - don't fail the entire operation
				log.Printf("Warning: failed to add watch for %s: %v", path, err)
				return nil
			}
			watchCount++
		}
		return nil
	})
}

// addLazyWatch adds directories to watcher up to a specified depth
func addLazyWatch(watcher *fsnotify.Watcher, root string, maxDepth int) error {
	processed := make(map[string]bool)
	watchCount := 0
	maxWatches := 1000
	
	log.Printf("Starting lazy watch for root: %s with maxDepth: %d", root, maxDepth)
	
	var walkDir func(string, int) error
	walkDir = func(path string, depth int) error {
		if depth > maxDepth {
			return nil
		}
		
		info, err := os.Stat(path)
		if err != nil {
			log.Printf("Skipping inaccessible path: %s (error: %v)", path, err)
			return nil
		}
		
		if !info.IsDir() {
			return nil
		}
		
		base := filepath.Base(path)
		if shouldSkipDirectory(base) {
			log.Printf("Skipping filtered directory: %s (base: %s)", path, base)
			return nil
		}
		
		if processed[path] {
			log.Printf("Skipping already processed directory: %s", path)
			return nil
		}
		processed[path] = true
		
		if watchCount >= maxWatches {
			log.Printf("Warning: reached maximum watch limit (%d), skipping remaining directories", maxWatches)
			return nil
		}
		
		if err := watcher.Add(path); err != nil {
			log.Printf("Warning: failed to add watch for %s: %v", path, err)
			return nil
		}
		watchCount++
		log.Printf("Added watch for directory: %s (depth: %d, total watches: %d)", path, depth, watchCount)
		
		// Read directory contents
		entries, err := os.ReadDir(path)
		if err != nil {
			log.Printf("Cannot read directory contents: %s (error: %v)", path, err)
			return nil
		}
		
		// Recursively process subdirectories
		for _, entry := range entries {
			if entry.IsDir() {
				subPath := filepath.Join(path, entry.Name())
				if err := walkDir(subPath, depth+1); err != nil {
					return err
				}
			}
		}
		
		return nil
	}
	
	err := walkDir(root, 0)
	log.Printf("Lazy watch completed. Total directories watched: %d", watchCount)
	return err
}

// addDirectoryWatch adds a specific directory and its immediate subdirectories to the watcher
func addDirectoryWatch(watcher *fsnotify.Watcher, dirPath string) error {
	watchCount := 0
	maxWatches := 1000
	
	log.Printf("Expanding folder watch for: %s", dirPath)
	
	// Add the directory itself
	info, err := os.Stat(dirPath)
	if err != nil {
		log.Printf("Cannot stat directory: %s (error: %v)", dirPath, err)
		return err
	}
	
	if !info.IsDir() {
		log.Printf("Path is not a directory: %s", dirPath)
		return fmt.Errorf("path is not a directory: %s", dirPath)
	}
	
	base := filepath.Base(dirPath)
	if shouldSkipDirectory(base) {
		log.Printf("Skipping filtered directory during expansion: %s (base: %s)", dirPath, base)
		return nil
	}
	
	if err := watcher.Add(dirPath); err != nil {
		log.Printf("Failed to add watch for directory: %s (error: %v)", dirPath, err)
		return err
	}
	watchCount++
	log.Printf("Added watch for expanded directory: %s", dirPath)
	
	// Add immediate subdirectories
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		log.Printf("Cannot read directory contents: %s (error: %v)", dirPath, err)
		return nil
	}
	
	for _, entry := range entries {
		if entry.IsDir() {
			subPath := filepath.Join(dirPath, entry.Name())
			base := filepath.Base(subPath)
			if shouldSkipDirectory(base) {
				log.Printf("Skipping filtered subdirectory: %s (base: %s)", subPath, base)
				continue
			}
			
			if watchCount >= maxWatches {
				log.Printf("Warning: reached maximum watch limit (%d), skipping remaining directories", maxWatches)
				break
			}
			
			if err := watcher.Add(subPath); err != nil {
				log.Printf("Warning: failed to add watch for %s: %v", subPath, err)
				continue
			}
			watchCount++
			log.Printf("Added watch for subdirectory: %s (total: %d)", subPath, watchCount)
		}
	}
	
	log.Printf("Folder expansion completed for: %s (total directories watched: %d)", dirPath, watchCount)
	return nil
}

// shouldSkipDirectory determines if a directory should be skipped for file watching
func shouldSkipDirectory(name string) bool {
	skipDirs := map[string]bool{
		".git":         true,
		"node_modules": true,
		".next":        true,
		".pnpm":        true,
		"target":       true,
		"__pycache__":  true,
		".venv":        true,
		"venv":         true,
		".tox":         true,
		"coverage":     true,
		".pytest_cache": true,
		".mypy_cache":  true,
		".cache":       true,
		".idea":        true,
	}
	return skipDirs[name]
}



func handleGet(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("content-type", "application/json")

	// Get root path from query parameter
	rootPath := r.URL.Query().Get("root")
	if rootPath == "" || rootPath == "." {
		// Get current working directory
		if cwd, err := os.Getwd(); err == nil {
			rootPath = cwd
		} else {
			rootPath = "."
		}
	}

	// Handle /files and /files/*
	if strings.HasPrefix(r.URL.Path, "/files") {
		// Handle specific file operations
		if len(r.URL.Path) > len("/files") && r.URL.Path[len("/files")] == '/' {
			path := strings.TrimPrefix(r.URL.Path, "/files")

			content, err := vfs.ReadFile(path, rootPath)
			if err != nil {
				http.Error(w, err.Error(), http.StatusNotFound)
				return
			}
			w.Header().Set("content-type", "text/plain")
			w.Write([]byte(content))
			return
		}

		// Handle /files (the file tree)
		if r.URL.Path == "/files" {
			// Check if we want a specific subtree
			if path := r.URL.Query().Get("path"); path != "" {
				// Get subtree for lazy loading
				fullPath := filepath.Join(rootPath, path)
				info, err := os.Stat(fullPath)
				if err != nil {
					http.Error(w, err.Error(), http.StatusNotFound)
					return
				}
				
				if !info.IsDir() {
					http.Error(w, "path is not a directory", http.StatusBadRequest)
					return
				}
				
				tree, err := vfs.GetDirectoryContents(fullPath, rootPath)
				if err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
				
				json.NewEncoder(w).Encode(tree)
				return
			}

			// Default: get tree with lazy loading (limited depth)
			tree, err := vfs.GetTree(rootPath)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			json.NewEncoder(w).Encode(tree)
			return
		}
	}

	http.NotFound(w, r)
}

func handlePost(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("content-type", "application/json")

	// Get root path from query parameter
	rootPath := r.URL.Query().Get("root")
	if rootPath == "" || rootPath == "." {
		// Get current working directory
		if cwd, err := os.Getwd(); err == nil {
			rootPath = cwd
		} else {
			rootPath = "."
		}
	}

	// Handle /files
	if r.URL.Path == "/files" {
		// Create new file or directory
		var req struct {
			Path string `json:"path"`
			Type string `json:"type"` // "file" or "folder"
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Printf("[API] POST /files: failed to decode body: %v", err)
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		log.Printf("[API] POST /files: rootPath=%q, req.Path=%q, req.Type=%q", rootPath, req.Path, req.Type)

		var err error
		if req.Type == "folder" {
			err = vfs.CreateDirectory(req.Path, rootPath)
		} else {
			err = vfs.CreateFile(req.Path, rootPath)
		}

		if err != nil {
			log.Printf("[API] POST /files: failed to create %s %q (root %q): %v", req.Type, req.Path, rootPath, err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		log.Printf("[API] POST /files: successfully created %s %q (root %q)", req.Type, req.Path, rootPath)
		w.WriteHeader(http.StatusCreated)
		return
	}

	http.NotFound(w, r)
}

func handlePut(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("content-type", "application/json")

	// Get root path from query parameter
	rootPath := r.URL.Query().Get("root")
	if rootPath == "" || rootPath == "." {
		// Get current working directory
		if cwd, err := os.Getwd(); err == nil {
			rootPath = cwd
		} else {
			rootPath = "."
		}
	}

	// Handle /files/*
	if strings.HasPrefix(r.URL.Path, "/files") && len(r.URL.Path) > len("/files") && r.URL.Path[len("/files")] == '/' {
		path := strings.TrimPrefix(r.URL.Path, "/files")

		buf := new(strings.Builder)
		io.Copy(buf, r.Body)
		err := vfs.WriteFile(path, rootPath, buf.String())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}

	http.NotFound(w, r)
}

func handlePatch(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("content-type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "PATCH, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Get root path from query parameter
	rootPath := r.URL.Query().Get("root")
	if rootPath == "" || rootPath == "." {
		// Get current working directory
		if cwd, err := os.Getwd(); err == nil {
			rootPath = cwd
		} else {
			rootPath = "."
		}
	}

	// Handle /files/* for file renaming
	if strings.HasPrefix(r.URL.Path, "/files") && len(r.URL.Path) > len("/files") && r.URL.Path[len("/files")] == '/' {
		path := strings.TrimPrefix(r.URL.Path, "/files")

		// Parse request body for new path
		var req struct {
			NewPath string `json:"newPath"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if req.NewPath == "" {
			http.Error(w, "newPath is required", http.StatusBadRequest)
			return
		}

		// Perform the rename operation
		oldFullPath := filepath.Join(rootPath, path)
		newFullPath := filepath.Join(rootPath, req.NewPath)

		// Ensure the new directory exists
		newDir := filepath.Dir(newFullPath)
		if err := os.MkdirAll(newDir, 0755); err != nil {
			log.Printf("Failed to create directory %s: %v", newDir, err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Perform the rename
		if err := os.Rename(oldFullPath, newFullPath); err != nil {
			log.Printf("Failed to rename %s to %s: %v", oldFullPath, newFullPath, err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		log.Printf("Successfully renamed %s to %s", oldFullPath, newFullPath)
		w.WriteHeader(http.StatusOK)
		return
	}

	http.NotFound(w, r)
}

func handleDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("content-type", "application/json")

	// Get root path from query parameter
	rootPath := r.URL.Query().Get("root")
	if rootPath == "" || rootPath == "." {
		// Get current working directory
		if cwd, err := os.Getwd(); err == nil {
			rootPath = cwd
		} else {
			rootPath = "."
		}
	}

	// Handle /files/*
	if strings.HasPrefix(r.URL.Path, "/files") && len(r.URL.Path) > len("/files") && r.URL.Path[len("/files")] == '/' {
		path := strings.TrimPrefix(r.URL.Path, "/files")

		err := vfs.DeleteFile(path, rootPath)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}

	http.NotFound(w, r)
}
