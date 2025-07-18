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

// Directories to skip
var skipDirs = map[string]bool{
	"node_modules": true,
	".git":         true,
	".next":        true,
	".pnpm":        true,
	".vscode":      true,
	".idea":        true,
	"__pycache__":  true,
	".nuxt":        true,
	".venv":        true,
	"venv":         true,
	".pipenv":      true,
	".pytest_cache": true,
	".ruff_cache":  true,
	".mypy_cache":  true,
}

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

		// Convert to relative path
		relPath, err := filepath.Rel(rootPath, path)
		if err != nil {
			return err
		}

		// Skip root directory itself
		if relPath == "." {
			return nil
		}

		// Check if this path should be skipped
		pathParts := strings.Split(relPath, string(filepath.Separator))
		for _, part := range pathParts {
			if skipDirs[part] {
				if info.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}
		}

		// Skip hidden files and directories (except .gitignore, .dockerignore, etc.)
		// if strings.HasPrefix(info.Name(), ".") && info.Name() != ".gitignore" && info.Name() != ".dockerignore" && info.Name() != ".env" {
		// 	if info.IsDir() {
		// 		return filepath.SkipDir
		// 	}
		// 	return nil
		// }

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

// Helper to clean and validate a path
func cleanAndValidatePath(p string) (string, error) {
	p = strings.TrimPrefix(p, "/")
	p = filepath.Clean(p)
	if p == "." || p == "" {
		return "", nil
	}
	if strings.HasPrefix(p, "..") {
		return "", os.ErrPermission
	}
	return p, nil
}

// ReadFile reads actual file content
func ReadFile(filePath, rootPath string) (string, error) {
	p, err := cleanAndValidatePath(filePath)
	if err != nil {
		return "", err
	}
	fullPath := filepath.Join(rootPath, p)
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

// WriteFile writes to actual file
func WriteFile(filePath, rootPath, content string) error {
	p, err := cleanAndValidatePath(filePath)
	if err != nil {
		return err
	}
	fullPath := filepath.Join(rootPath, p)

	// Ensure directory exists
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	return os.WriteFile(fullPath, []byte(content), 0644)
}

// DeleteFile deletes actual file or directory
func DeleteFile(filePath, rootPath string) error {
	p, err := cleanAndValidatePath(filePath)
	if err != nil {
		return err
	}
	fullPath := filepath.Join(rootPath, p)
	return os.RemoveAll(fullPath)
}

// CreateFile creates a new file
func CreateFile(filePath, rootPath string) error {
	p, err := cleanAndValidatePath(filePath)
	if err != nil {
		return err
	}
	fullPath := filepath.Join(rootPath, p)

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
	p, err := cleanAndValidatePath(dirPath)
	if err != nil {
		return err
	}
	fullPath := filepath.Join(rootPath, p)
	return os.MkdirAll(fullPath, 0755)
}

// RenameFile renames a file or directory
func RenameFile(oldPath, newPath, rootPath string) error {
	pOld, err := cleanAndValidatePath(oldPath)
	if err != nil {
		return err
	}
	pNew, err := cleanAndValidatePath(newPath)
	if err != nil {
		return err
	}
	oldFullPath := filepath.Join(rootPath, pOld)
	newFullPath := filepath.Join(rootPath, pNew)
	return os.Rename(oldFullPath, newFullPath)
}
