package vfs

import (
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
)

// FileNode represents a file or directory in the tree
type FileNode struct {
	Name     string      `json:"name"`
	Type     string      `json:"type"` // "file" | "folder"
	Path     string      `json:"path"`
	Children []*FileNode `json:"children,omitempty"`
	HasMore  bool        `json:"hasMore,omitempty"` // Indicates if there are more children not loaded
	Loaded   bool        `json:"loaded,omitempty"`  // Indicates if children have been loaded
}

// TreeOptions configures how the tree is built
type TreeOptions struct {
	MaxDepth     int    `json:"maxDepth"`     // Maximum depth to traverse
	MaxFiles     int    `json:"maxFiles"`     // Maximum files per directory
	SkipPatterns []string `json:"skipPatterns"` // Patterns to skip
	RootPath     string `json:"rootPath"`     // Root path for the tree
}

var (
	mu = &sync.RWMutex{}
	
	// Default skip directories
	skipDirs = map[string]bool{
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
		"target":       true,
		"build":        true,
		"dist":         true,
	}
)

// GetTreeLazy returns a file tree with lazy loading support
func GetTreeLazy(rootPath string, options TreeOptions) ([]*FileNode, error) {
	if rootPath == "" {
		rootPath = "/"
	}

	// Normalize root path
	rootPath = filepath.Clean(rootPath)
	
	// Use default options if none provided
	if options.MaxDepth == 0 {
		options.MaxDepth = 2 // Default: only load immediate children
	}
	if options.MaxFiles == 0 {
		options.MaxFiles = 100 // Default: limit to 100 files per directory
	}
	if options.RootPath == "" {
		options.RootPath = rootPath
	}

	return getDirectoryContents(rootPath, "", options, 0)
}

// getDirectoryContents gets contents of a directory with lazy loading
func getDirectoryContents(dirPath, relPath string, options TreeOptions, currentDepth int) ([]*FileNode, error) {
	fullPath := filepath.Join(options.RootPath, relPath)
	
	// Read directory contents
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return nil, err
	}

	// Separate folders and files for sorting
	var folders []os.DirEntry
	var files []os.DirEntry
	
	for _, entry := range entries {
		if entry.IsDir() {
			folders = append(folders, entry)
		} else {
			files = append(files, entry)
		}
	}
	
	// Sort folders and files alphabetically
	sort.Slice(folders, func(i, j int) bool {
		return folders[i].Name() < folders[j].Name()
	})
	sort.Slice(files, func(i, j int) bool {
		return files[i].Name() < files[j].Name()
	})
	
	// Combine: folders first, then files
	var sortedEntries []os.DirEntry
	sortedEntries = append(sortedEntries, folders...)
	sortedEntries = append(sortedEntries, files...)

	var nodes []*FileNode
	fileCount := 0
	
	for _, entry := range sortedEntries {
		// Skip hidden files and directories
		// if strings.HasPrefix(entry.Name(), ".") && entry.Name() != "." && entry.Name() != ".." {
		// 	continue
		// }
		
		// Skip filtered directories
		if entry.IsDir() && skipDirs[entry.Name()] {
			continue
		}
		
		// Build relative path
		entryRelPath := filepath.Join(relPath, entry.Name())
		if relPath == "" {
			entryRelPath = entry.Name()
		}
		
		// Build normalized path
		normalizedPath := "/" + filepath.ToSlash(entryRelPath)
		
		node := &FileNode{
			Name:    entry.Name(),
			Path:    normalizedPath,
			Loaded:  false, // Children not loaded yet
		}
		
		if entry.IsDir() {
			node.Type = "folder"
			
			// Check if directory has children (but don't load them yet)
			subPath := filepath.Join(fullPath, entry.Name())
			subEntries, err := os.ReadDir(subPath)
			if err == nil && len(subEntries) > 0 {
				// Count visible children
				visibleChildren := 0
				for _, subEntry := range subEntries {
					if !strings.HasPrefix(subEntry.Name(), ".") && !skipDirs[subEntry.Name()] {
						visibleChildren++
					}
				}
				
				node.HasMore = visibleChildren > 0
				if visibleChildren > options.MaxFiles {
					node.HasMore = true
				}
			}
		} else {
			node.Type = "file"
			fileCount++
		}
		
		// Respect max files limit
		if fileCount >= options.MaxFiles && !entry.IsDir() {
			// Add a "more files" indicator
			nodes = append(nodes, &FileNode{
				Name:    "...",
				Type:    "file",
				Path:    normalizedPath + "/more",
				Loaded:  true,
			})
			break
		}
		
		nodes = append(nodes, node)
		
		// Load children if within depth limit and directory is small
		if entry.IsDir() && currentDepth < options.MaxDepth {
			// For immediate children, load a limited set
			childOptions := TreeOptions{
				MaxDepth: 1, // Only load one level deeper
				MaxFiles: 10, // Limit to 10 items for preview
				RootPath: options.RootPath,
			}
			
			children, err := getDirectoryContents(
				filepath.Join(dirPath, entry.Name()),
				entryRelPath,
				childOptions,
				currentDepth+1,
			)
			if err == nil && len(children) > 0 {
				node.Children = children
				node.Loaded = true
			}
		}
	}
	
	return nodes, nil
}

// GetDirectoryContents gets contents of a specific directory (for lazy loading)
func GetDirectoryContents(dirPath string, rootPath string) ([]*FileNode, error) {
	options := TreeOptions{
		MaxDepth: 1, // Only immediate children
		MaxFiles: 100,
		RootPath: rootPath,
	}
	
	relPath, err := filepath.Rel(rootPath, dirPath)
	if err != nil {
		return nil, err
	}
	
	return getDirectoryContents(dirPath, relPath, options, 0)
}

// GetTree returns the full tree (legacy function for backward compatibility)
func GetTree(rootPath string) ([]*FileNode, error) {
	options := TreeOptions{
		MaxDepth: 2, // Limit depth to prevent performance issues
		MaxFiles: 50,
		RootPath: rootPath,
	}
	
	return GetTreeLazy(rootPath, options)
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

// cleanAndValidatePath cleans and validates a path
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
