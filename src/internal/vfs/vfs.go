package vfs

import (
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"unicode/utf8"
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
	MaxDepth     int      `json:"maxDepth"`     // Maximum depth to traverse
	MaxFiles     int      `json:"maxFiles"`     // Maximum files per directory
	SkipPatterns []string `json:"skipPatterns"` // Patterns to skip
	RootPath     string   `json:"rootPath"`     // Root path for the tree
}

// SearchOptions configures workspace text search.
type SearchOptions struct {
	Query         string `json:"query"`
	Replace       string `json:"replace,omitempty"`
	Include       string `json:"include,omitempty"`
	Exclude       string `json:"exclude,omitempty"`
	CaseSensitive bool   `json:"caseSensitive"`
	WholeWord     bool   `json:"wholeWord"`
	UseRegex      bool   `json:"useRegex"`
}

// SearchMatch is a single text match inside a file.
type SearchMatch struct {
	Line          int    `json:"line"`
	Column        int    `json:"column"`
	EndColumn     int    `json:"endColumn"`
	LineText      string `json:"lineText"`
	PreviewStart  int    `json:"previewStart"`
	PreviewLength int    `json:"previewLength"`
}

// SearchFileResult contains all matches for one file.
type SearchFileResult struct {
	Path    string        `json:"path"`
	Matches []SearchMatch `json:"matches"`
}

// SearchResult is returned by workspace text search.
type SearchResult struct {
	Files    []SearchFileResult `json:"files"`
	Matches  int                `json:"matches"`
	LimitHit bool               `json:"limitHit"`
}

// ReplaceResult is returned after a workspace replacement.
type ReplaceResult struct {
	Files        int      `json:"files"`
	Replacements int      `json:"replacements"`
	Paths        []string `json:"paths"`
}

const (
	maxSearchFileSize = 2 * 1024 * 1024
	maxSearchMatches  = 10000
)

var (
	mu = &sync.RWMutex{}

	// Default skip directories
	skipDirs = map[string]bool{
		"node_modules":  true,
		".git":          true,
		".next":         true,
		".pnpm":         true,
		".vscode":       true,
		".idea":         true,
		"__pycache__":   true,
		".nuxt":         true,
		".venv":         true,
		"venv":          true,
		".pipenv":       true,
		".pytest_cache": true,
		".ruff_cache":   true,
		".mypy_cache":   true,
		"target":        true,
		"build":         true,
		"dist":          true,
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

	var nodes []*FileNode = make([]*FileNode, 0) // Initialize as empty slice instead of nil
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
			Name:   entry.Name(),
			Path:   normalizedPath,
			Loaded: false, // Children not loaded yet
		}

		if entry.IsDir() {
			node.Type = "folder"

			// Check if directory has children (but don't load them yet)
			subPath := filepath.Join(fullPath, entry.Name())
			subEntries, err := os.ReadDir(subPath)
			if err == nil && len(subEntries) > 0 {
				// Count visible children (consistent with main iteration loop)
				visibleChildren := 0
				for _, subEntry := range subEntries {
					if subEntry.IsDir() && skipDirs[subEntry.Name()] {
						continue
					}
					visibleChildren++
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
				Name:   "...",
				Type:   "file",
				Path:   normalizedPath + "/more",
				Loaded: true,
			})
			break
		}

		nodes = append(nodes, node)

		// Load children if within depth limit and directory is small
		if entry.IsDir() && currentDepth < options.MaxDepth {
			// For immediate children, load a limited set
			childOptions := TreeOptions{
				MaxDepth: 1,  // Only load one level deeper
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

// Copy copies a file or directory recursively
func Copy(srcPath, dstPath, rootPath string) error {
	srcP, err := cleanAndValidatePath(srcPath)
	if err != nil {
		return err
	}
	dstP, err := cleanAndValidatePath(dstPath)
	if err != nil {
		return err
	}

	fullSrc := filepath.Join(rootPath, srcP)
	fullDst := filepath.Join(rootPath, dstP)

	info, err := os.Stat(fullSrc)
	if err != nil {
		return err
	}

	if info.IsDir() {
		return copyDir(fullSrc, fullDst)
	}
	return copyFile(fullSrc, fullDst)
}

// SearchWorkspace searches text files below rootPath.
func SearchWorkspace(rootPath string, options SearchOptions) (SearchResult, error) {
	var result SearchResult
	matcher, err := buildSearchRegexp(options)
	if err != nil {
		return result, err
	}

	err = filepath.WalkDir(rootPath, func(path string, entry os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if path == rootPath {
			return nil
		}

		name := entry.Name()
		if entry.IsDir() {
			if skipDirs[name] {
				return filepath.SkipDir
			}
			return nil
		}

		relPath, err := filepath.Rel(rootPath, path)
		if err != nil {
			return nil
		}
		if !matchesSearchFilters(filepath.ToSlash(relPath), options) {
			return nil
		}

		info, err := entry.Info()
		if err != nil || info.Size() > maxSearchFileSize {
			return nil
		}

		content, err := os.ReadFile(path)
		if err != nil || !utf8.Valid(content) || hasNulByte(content) {
			return nil
		}

		fileResult := searchFileContent(path, rootPath, string(content), matcher)
		if len(fileResult.Matches) == 0 {
			return nil
		}

		for _, match := range fileResult.Matches {
			if result.Matches >= maxSearchMatches {
				result.LimitHit = true
				return filepath.SkipAll
			}
			if len(result.Files) == 0 || result.Files[len(result.Files)-1].Path != fileResult.Path {
				result.Files = append(result.Files, SearchFileResult{Path: fileResult.Path})
			}
			last := &result.Files[len(result.Files)-1]
			last.Matches = append(last.Matches, match)
			result.Matches++
		}
		return nil
	})

	return result, err
}

// ReplaceWorkspace replaces search matches in text files below rootPath.
func ReplaceWorkspace(rootPath string, options SearchOptions) (ReplaceResult, error) {
	var result ReplaceResult
	matcher, err := buildSearchRegexp(options)
	if err != nil {
		return result, err
	}

	err = filepath.WalkDir(rootPath, func(path string, entry os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if path == rootPath {
			return nil
		}

		name := entry.Name()
		if entry.IsDir() {
			if skipDirs[name] {
				return filepath.SkipDir
			}
			return nil
		}

		relPath, err := filepath.Rel(rootPath, path)
		if err != nil {
			return nil
		}
		if !matchesSearchFilters(filepath.ToSlash(relPath), options) {
			return nil
		}

		info, err := entry.Info()
		if err != nil || info.Size() > maxSearchFileSize {
			return nil
		}

		content, err := os.ReadFile(path)
		if err != nil || !utf8.Valid(content) || hasNulByte(content) {
			return nil
		}

		matches := matcher.FindAllIndex(content, -1)
		if len(matches) == 0 {
			return nil
		}

		replaced := matcher.ReplaceAllLiteralString(string(content), options.Replace)
		if options.UseRegex {
			replaced = matcher.ReplaceAllString(string(content), options.Replace)
		}
		if err := os.WriteFile(path, []byte(replaced), info.Mode()); err != nil {
			return err
		}

		result.Files++
		result.Replacements += len(matches)
		result.Paths = append(result.Paths, "/"+filepath.ToSlash(relPath))
		return nil
	})

	return result, err
}

func buildSearchRegexp(options SearchOptions) (*regexp.Regexp, error) {
	pattern := options.Query
	if !options.UseRegex {
		pattern = regexp.QuoteMeta(pattern)
	}
	if options.WholeWord {
		pattern = `\b` + pattern + `\b`
	}
	if !options.CaseSensitive {
		pattern = `(?i)` + pattern
	}
	return regexp.Compile(pattern)
}

func matchesSearchFilters(relPath string, options SearchOptions) bool {
	path := strings.TrimPrefix(relPath, "/")
	if options.Include != "" && !pathMatchesAnyToken(path, options.Include) {
		return false
	}
	if options.Exclude != "" && pathMatchesAnyToken(path, options.Exclude) {
		return false
	}
	return true
}

func pathMatchesAnyToken(path, filter string) bool {
	for _, token := range strings.Split(filter, ",") {
		token = strings.TrimSpace(token)
		if token == "" {
			continue
		}
		normalized := strings.Trim(strings.ReplaceAll(token, "\\", "/"), "/")
		if wildcardMatchesPath(path, normalized) {
			return true
		}
	}
	return false
}

func wildcardMatchesPath(path, pattern string) bool {
	if pattern == "" {
		return false
	}
	if !strings.ContainsAny(pattern, "*?") {
		return strings.Contains(path, pattern)
	}

	targets := []string{path}
	if !strings.Contains(pattern, "/") {
		targets = append(targets, filepath.Base(path))
	}

	re, err := regexp.Compile("^" + globToRegexp(pattern) + "$")
	if err != nil {
		return false
	}
	for _, target := range targets {
		if re.MatchString(target) {
			return true
		}
	}
	return false
}

func globToRegexp(pattern string) string {
	var builder strings.Builder
	for i := 0; i < len(pattern); i++ {
		switch pattern[i] {
		case '*':
			if i+1 < len(pattern) && pattern[i+1] == '*' {
				builder.WriteString(".*")
				i++
			} else {
				builder.WriteString(`[^/]*`)
			}
		case '?':
			builder.WriteString(`[^/]`)
		default:
			builder.WriteString(regexp.QuoteMeta(string(pattern[i])))
		}
	}
	return builder.String()
}

func searchFileContent(path, rootPath, content string, matcher *regexp.Regexp) SearchFileResult {
	relPath, err := filepath.Rel(rootPath, path)
	if err != nil {
		relPath = path
	}
	fileResult := SearchFileResult{Path: "/" + filepath.ToSlash(relPath)}
	lines := strings.SplitAfter(content, "\n")
	offset := 0

	for lineIndex, line := range lines {
		lineWithoutBreak := strings.TrimRight(line, "\r\n")
		lineStart := offset
		matches := matcher.FindAllStringIndex(lineWithoutBreak, -1)
		for _, match := range matches {
			start := lineStart + match[0]
			end := lineStart + match[1]
			fileResult.Matches = append(fileResult.Matches, SearchMatch{
				Line:          lineIndex + 1,
				Column:        utf8.RuneCountInString(content[lineStart:start]) + 1,
				EndColumn:     utf8.RuneCountInString(content[lineStart:end]) + 1,
				LineText:      lineWithoutBreak,
				PreviewStart:  utf8.RuneCountInString(content[lineStart:start]),
				PreviewLength: utf8.RuneCountInString(content[start:end]),
			})
		}
		offset += len(line)
	}

	return fileResult
}

func hasNulByte(content []byte) bool {
	for _, b := range content {
		if b == 0 {
			return true
		}
	}
	return false
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return err
	}

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	if _, err = in.WriteTo(out); err != nil {
		return err
	}
	return out.Sync()
}

func copyDir(src, dst string) error {
	if err := os.MkdirAll(dst, 0755); err != nil {
		return err
	}

	entries, err := os.ReadDir(src)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		srcPath := filepath.Join(src, entry.Name())
		dstPath := filepath.Join(dst, entry.Name())

		if entry.IsDir() {
			if err := copyDir(srcPath, dstPath); err != nil {
				return err
			}
		} else {
			if err := copyFile(srcPath, dstPath); err != nil {
				return err
			}
		}
	}
	return nil
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
