package web

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"

	"boxy-ide/internal/vfs"
)

func Handlers() (api http.Handler, web http.Handler) {
	// 1. REST API wrapper
	api = http.StripPrefix("/api", http.HandlerFunc(apiHandler))

	// 2. SPA catch-all – serve UI files from filesystem
	web = http.StripPrefix("/", http.FileServer(http.Dir("ui/out")))
	return
}

func apiHandler(w http.ResponseWriter, r *http.Request) {
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

			switch r.Method {
			case "GET":
				content, err := vfs.ReadFile(path, rootPath)
				if err != nil {
					http.Error(w, err.Error(), http.StatusNotFound)
					return
				}
				w.Header().Set("content-type", "text/plain")
				w.Write([]byte(content))
			case "PUT":
				buf := new(strings.Builder)
				io.Copy(buf, r.Body)
				err := vfs.WriteFile(path, rootPath, buf.String())
				if err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
				w.WriteHeader(http.StatusNoContent)
			case "DELETE":
				err := vfs.DeleteFile(path, rootPath)
				if err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
				w.WriteHeader(http.StatusNoContent)
			case "PATCH":
				// Rename file/directory
				var req struct {
					NewPath string `json:"newPath"`
				}
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					http.Error(w, err.Error(), http.StatusBadRequest)
					return
				}

				err := vfs.RenameFile(path, req.NewPath, rootPath)
				if err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
				w.WriteHeader(http.StatusNoContent)
			default:
				http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			}
			return
		}

		// Handle /files (the file tree)
		if r.URL.Path == "/files" {
			switch r.Method {
			case "GET":
				tree, err := vfs.GetTree(rootPath)
				if err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
				json.NewEncoder(w).Encode(tree)
			case "POST":
				// Create new file or directory
				var req struct {
					Path string `json:"path"`
					Type string `json:"type"` // "file" or "folder"
				}
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					http.Error(w, err.Error(), http.StatusBadRequest)
					return
				}

				var err error
				if req.Type == "folder" {
					err = vfs.CreateDirectory(req.Path, rootPath)
				} else {
					err = vfs.CreateFile(req.Path, rootPath)
				}

				if err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
				w.WriteHeader(http.StatusCreated)
			default:
				http.NotFound(w, r)
			}
			return
		}
	}

	http.NotFound(w, r)
}
