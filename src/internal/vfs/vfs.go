package vfs

import (
	"os"
	"path/filepath"
	"strings"
	"sync"
)

// FileNode mirrors previous TS model
type FileNode struct {
	Name     string      `json:"name"`
	Type     string      `json:"type"` // "file" | "folder"
	Path     string      `json:"path"`
	Children []*FileNode `json:"children,omitempty"`
}

var (
	mu = &sync.RWMutex{}
)

// GetTree returns file tree from actual filesystem
func GetTree(rootPath string) ([]*FileNode, error) {
	if rootPath == "" {
		rootPath = "/"
	}

	var nodes []*FileNode
	err := filepath.Walk(rootPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip hidden files and directories
		if strings.HasPrefix(filepath.Base(path), ".") {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// Convert to relative path
		relPath, err := filepath.Rel(rootPath, path)
		if err != nil {
			return err
		}

		// Skip root directory itself
		if relPath == "." {
			return nil
		}

		node := &FileNode{
			Name: info.Name(),
			Path: "/" + strings.ReplaceAll(relPath, "\\", "/"),
		}

		if info.IsDir() {
			node.Type = "folder"
		} else {
			node.Type = "file"
		}

		// Add to appropriate parent
		if relPath == info.Name() {
			// Direct child of root
			nodes = append(nodes, node)
		} else {
			// Find parent and add as child
			parentPath := filepath.Dir(relPath)
			addToParent(nodes, parentPath, node)
		}

		return nil
	})

	return nodes, err
}

func addToParent(nodes []*FileNode, parentPath string, child *FileNode) {
	for _, node := range nodes {
		if node.Type == "folder" {
			// Check if this is the parent
			if strings.ReplaceAll(parentPath, "\\", "/") == strings.TrimPrefix(node.Path, "/") {
				node.Children = append(node.Children, child)
				return
			}
			// Recursively search in children
			addToParent(node.Children, parentPath, child)
		}
	}
}

// ReadFile reads actual file content
func ReadFile(filePath, rootPath string) (string, error) {
	// If filePath starts with rootPath, use it directly
	if strings.HasPrefix(filePath, "/") {
		filePath = strings.TrimPrefix(filePath, "/")
	}
	fullPath := filepath.Join(rootPath, filePath)
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

// WriteFile writes to actual file
func WriteFile(filePath, rootPath, content string) error {
	// If filePath starts with rootPath, use it directly
	if strings.HasPrefix(filePath, "/") {
		filePath = strings.TrimPrefix(filePath, "/")
	}
	fullPath := filepath.Join(rootPath, filePath)

	// Ensure directory exists
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	return os.WriteFile(fullPath, []byte(content), 0644)
}

// DeleteFile deletes actual file or directory
func DeleteFile(filePath, rootPath string) error {
	// If filePath starts with rootPath, use it directly
	if strings.HasPrefix(filePath, "/") {
		filePath = strings.TrimPrefix(filePath, "/")
	}
	fullPath := filepath.Join(rootPath, filePath)
	return os.RemoveAll(fullPath)
}

// CreateFile creates a new file
func CreateFile(filePath, rootPath string) error {
	// If filePath starts with rootPath, use it directly
	if strings.HasPrefix(filePath, "/") {
		filePath = strings.TrimPrefix(filePath, "/")
	}
	fullPath := filepath.Join(rootPath, filePath)

	// Ensure directory exists
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	file, err := os.Create(fullPath)
	if err != nil {
		return err
	}
	defer file.Close()

	return nil
}

// CreateDirectory creates a new directory
func CreateDirectory(dirPath, rootPath string) error {
	// If dirPath starts with rootPath, use it directly
	if strings.HasPrefix(dirPath, "/") {
		dirPath = strings.TrimPrefix(dirPath, "/")
	}
	fullPath := filepath.Join(rootPath, dirPath)
	return os.MkdirAll(fullPath, 0755)
}

// RenameFile renames a file or directory
func RenameFile(oldPath, newPath, rootPath string) error {
	// If paths start with rootPath, use them directly
	if strings.HasPrefix(oldPath, "/") {
		oldPath = strings.TrimPrefix(oldPath, "/")
	}
	if strings.HasPrefix(newPath, "/") {
		newPath = strings.TrimPrefix(newPath, "/")
	}
	oldFullPath := filepath.Join(rootPath, oldPath)
	newFullPath := filepath.Join(rootPath, newPath)
	return os.Rename(oldFullPath, newFullPath)
}
 