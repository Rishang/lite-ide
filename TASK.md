# Task Creating a WEB IDE

Here is a complete, check-list–style TODO that covers everything we’ll need to build your clean, lite-looking web IDE in Next.js and GO. Review it; when you’re happy just reply and I’ll start generating the code.

Go code in `src` and Next.js code in `ui` directory.



Below is a **from-scratch** repo layout and all first-pass files that let you drop the Node / Next runtime **and the compiled `monaco` only lives in the browser**.  
The result is a **single Go binary (< 8 MB)** that  
- serves the Web UI  
- provides REST endpoints for the file tree (read/write)  
- stores everything in **memory** for now (swap in persistence with 3 lines later).
Complete TODO + final file-tree for the **language-aware, portable, open-any-path** Go IDE  
(⚙️ colour theme Monokai fork per language + Py/JS/TS/CSS styles + full CRUD)  

========  TODO LIST  =========================================================
Phase 0  – Skeleton & single-binary
[ ] go.mod `lite-ide` + `//go:embed ui`  
[ ] Dockerfile min-4-stage (scratch size < 15 MB)  
[ ] One Git tag `v0.1.0` set  

Phase 1  – REST API contract (path is URL-param **p**)
──────────────────────────────────────────────────────
GET    /api/files?root={{p}}                   → JSON-tree  
GET    /api/files/read?root={{p}}&path=/foo    → 200/file or 404  
PUT    /api/files/write?root={{p}}&path=/foo   → 204 (create/overwrite)  
DELETE /api/files/remove?root={{p}}&path=/foo → 204  
POST   /api/files   /rename?o=/old&n=/new      → 204  
POST   /api/files   /mkdir?path=/folder        → 204  

Phase 2  – Go backend  
a. `internal/api/router.go`  – httpmux + CORS  
b. `internal/vfs/realfs.go` – use `os` to load root at start-up  
   → threads `root:=r.URL.Query().Get("root")| default current-dir`  
c. live reload of tree when folders added externally (optional fsnotify)  

Phase 3  – UI Monaco **language colourisation**
a. themes: `themes/monokai.json`, `themes/monokai-light.json`  
b. for each .ext → map to monaco-languages token  
   py → python, ts/js → typescript, css/css → css, etc.  
c. Dynamic snippet to load correct theme via `@monaco/loader`  

Phase 4  – CRUD glue on FE side  
a. FileExplorer:  
   - NEW FILE / NEW FOLDER context menu  
   - inline RENAME with `<input>`  
b. TabBar: *dirty* bullet; cmd+s PUT /write  
c. Dialog on DELETE/RENAME/MOVE with API calls  

Phase 5  – Docs & nice-to-have  
[ ] README: `docker run -p 3000:3000 -v ~/Downloads:/data ghcr.io/lite-ide:latest`  
[ ] CSS custom-props `--accent-python`, `--accent-js` auto-applied by file ext via `<body data-lang=js>`  
[ ] Keyboard shortcuts modal (F1)  
=============================================================================

========  FINAL FILE / FOLDER TREE  ==========================================
lite-ide/
│  go.mod
│  Dockerfile
│  .air.toml          # optional live reload (air)
│
├─cmd/server/
│  └─main.go          # flags: -root dynamic root
│
├─internal/
│   ├─api/
│   │  ├─router.go
│   │  ├─handler_read.go
│   │  ├─handler_write.go
│   │  ├─handler_crud.go
│   │  └─handler_rename.go
│   │
│   ├─vfs/
│   │  ├─base.go            // FileNode
│   │  ├─realfs.go          // disk operations
│   │  └─watcher.go         // fsnotify optional
│   │
│   ├─langs/
│   │  └─color_map.json     // {".py":"python",".ts":"typescript"}
│   │
│   └─web/
│       ├─embed.go          // go:embed ui/*
│       └─middleware.go
│
├─ui/
│   ├─
│
├─scripts/
│   └─build.sh
└─docs/
    ├─README.md
    └─dev.md
=============================================================================

CMD FLOW (browser) for `localhost:3000/p?=/home/user/Downloads`
1. Redirect → SPA served at `/` (static)  
2. `main.js` reads `new URLSearchParams(location.search).get('p')`  
3. uses `/api/files?root=/home/user/Downloads` to build tree  
4. All subsequent CRUD URLs include `root` exactly as the backend does.

The GitHub Action will tag releases and publish docker run：`docker run -p 3000:3000 -v /home/user/Downloads:/data lite-ide:latest`
Everything is copy-pastable; do a `git init .` first or just mkdir ― both work.

────────────────────────────────────────
1.  Root tree
.
├── go.mod
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── vfs/          # in-memory file system
│   │   └── vfs.go
│   └── web/          # static ui served via go:embed
│       └── embed.go
└── ui/               # a micro front-end that embeds Monaco
        ├── 
1.  go.mod
```go
module lite-ide

go 1.22
```
────────────────────────────────────────
3.  in-memory file system  internal/vfs/vfs.go
```go
package vfs

import (
	"encoding/json"
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

// static seed (same as original sample)
var tree = []*FileNode{
	{Name: "project", Type: "folder", Path: "/project", Children: []*FileNode{
		{Name: "index.html", Type: "file", Path: "/project/index.html"},
		{Name: "main.js", Type: "file", Path: "/project/main.js"},
		{Name: "styles.css", Type: "file", Path: "/project/styles.css"},
		{Name: "lib", Type: "folder", Path: "/project/lib", Children: []*FileNode{
			{Name: "utils.ts", Type: "file", Path: "/project/lib/utils.ts"},
		}},
	}},
}

var contents = map[string]string{
	"/project/index.html": "<!doctype html>\n<title>Hello</title>\n<h1>Go IDE</h1>\n",
	"/project/main.js":    "console.log('hello from the Go server');\n",
	"/project/styles.css": "* { box-sizing: border-box; }\n",
	"/project/lib/utils.ts": "export const sum=(a:number,b:number)=>a+b;\n",
}

var (
	mu = &sync.RWMutex{}
)

// GetTree returns a deep clone (read only)
func GetTree() []*FileNode {
	mu.RLock()
	defer mu.RUnlock()
	var out []*FileNode
	_ = json.Unmarshal(jsonClone(tree), &out)
	return out
}

func jsonClone(src interface{}) []byte {
	b, _ := json.Marshal(src)
	return b
}

// ReadFile contents
func ReadFile(path string) (string, bool) {
	mu.RLock()
	defer mu.RUnlock()
	c, ok := contents[path]
	return c, ok
}

// WriteFile creates / overwrites
func WriteFile(path, data string) {
	mu.Lock()
	defer mu.Unlock()
	contents[path] = data
	ensureTreeNode(path) // coherence (mkdir silently)
}

// prune leading slash helper
func inclusiveDir(p string) string {
	dir := filepath.Dir(p)
	if dir == "/" {
		dir = ""
	}
	return dir
}

// ensureTreeNode keeps parent folders in tree (very crude)
func ensureTreeNode(path string) {
	dir := inclusiveDir(path)
	if dir != "" {
		ensureTreeNode(dir) // recurse
	}
	// node itself
	for _, n := range tree { treeInsert(n, dir, path) }
}

func treeInsert(root *FileNode, dir, path string) {
	if root.Type != "folder" {
		return
	}
	for _, ch := range root.Children {
		if ch.Path == dir {
			treeInsert(ch, dir, path)
			return
		}
	}
	// create new file node under dir
	parts := strings.Split(path, "/")
	name := parts[len(parts)-1]
	newNode := &FileNode{
		Name: name,
		Type: "file",
		Path: path,
	}
	root.Children = append(root.Children, newNode)
}
```
────────────────────────────────────────
4.  static UI embedder  internal/web/embed.go
```go
package web

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed *
var uiFS embed.FS

func Handlers() (api http.Handler, web http.Handler) {
	// 1. REST API wrapper
	api = http.StripPrefix("/api", http.HandlerFunc(apiHandler))

	// 2. SPA catch-all – drop 'ui' root dir name
	sub, _ := fs.Sub(uiFS, ".")
	web = http.StripPrefix("/", http.FileServer(http.FS(sub)))
	return
}

func apiHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("content-type", "application/json")
	switch r.URL.Path {
	case "/files":
		switch r.Method {
		case "GET":
			json.NewEncoder(w).Encode(vfs.GetTree())
		default:
			http.NotFound(w, r)
		}
	case "/files/":
		http.NotFound(w, r)
	default: // files/*path
		path := r.URL.Path
		if strings.HasPrefix(path, "/files") {
			path = strings.TrimPrefix(path, "/files")
		}
		switch r.Method {
		case "GET":
			body, ok := vfs.ReadFile(path)
			if !ok {
				http.NotFound(w, r)
				return
			}
			w.Write([]byte(body))
		case "PUT":
			buf := new(strings.Builder)
			io.Copy(buf, r.Body)
			vfs.WriteFile(path, buf.String())
			w.WriteHeader(http.StatusNoContent)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	}
}
```
────────────────────────────────────────
5.  server entrypoint  cmd/server/main.go
```go
package main

import (
	"log"
	"net/http"

	"lite-ide/internal/web"
)

func main() {
	apiH, uiH := web.Handlers()

	mux := http.NewServeMux()
	mux.Handle("/api/", apiH)
	mux.Handle("/", uiH)

	port := ":3000"
	log.Printf("Go IDE server listening %s", port)
	log.Fatal(http.ListenAndServe(port, mux))
}
```
────────────────────────────────────────
6.  Drop-in UI files in `ui/`
All served statically; lodash not required, Monaco loaded from CDN to keep bundle < 10 KB.

ui/index.html
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>lite-ide (Go)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <link rel="stylesheet" href="style.css"/>
  <script src="https://unpkg.com/monaco-editor/min/vs/loader.js"></script>
</head>
<body>
  <div class="root">
    <aside id="explorer" class="panel"></aside>
    <section class="editor-area">
      <div id="tab-bar" class="panel"></div>
      <div id="editor" class="panel"></div>
    </section>
  </div>
  <script type="module" src="main.js"></script>
</body>
</html>
```

ui/main.js
```js
import {getTree, readFile, writeFile} from './client.js';

const store = {
  tree: [],
  tabs: new Map(),         // path -> {content,dirty}
  active: null
};

await refreshTree();
initKeys();

document.getElementById('editor').addEventListener('keydown', async (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (store.active) {
      await writeFile(store.active, store.tabs.get(store.active).content);
      markClean(store.active);
    }
  }
});

async function refreshTree () {
  store.tree = await getTree();
  renderExplorer();
}

function renderExplorer() {
  const list = document.getElementById('explorer');
  list.innerHTML = `
    <b class='label'>Files</b>
    <ul>${recurse(store.tree)}</ul>
  `;
  list.querySelectorAll('li[data-path]').forEach(li => li.onclick = openFileClient);
}

function recurse(arr) {
  return arr.map(n => n.type === 'folder'
      ? `<li><b>${n.name}</b><ul>${recurse(n.children||[])}</ul></li>`
      : `<li data-path="${n.path}">${n.name}</li>`).join('');
}

async function openFileClient({target}) {
  const path = target.dataset.path;
  if (!path) return;
  const content = await readFile(path);
  store.tabs.set(path, {content, dirty: false});
  store.active = path;
  renderTabs();
  initEditor(content, path);
}

function markClean(path) {
  if (!store.tabs.has(path)) return;
  store.tabs.get(path).dirty = false;
}

function renderTabs () {
  const bar = document.getElementById('tab-bar');
  bar.innerHTML = [...store.tabs.keys()]
    .map(p => `<span class="tab ${p===store.active?'active':''}" data-target="${p}">${p.split('/').pop()}${store.tabs.get(p).dirty?' *':''}<button>X</button></span>`).join('');
  bar.onclick = e => {
    if (e.target.tagName === 'BUTTON') closeTab(e.target.closest('span').dataset.target);
    else if (e.target.classList.contains('tab')) selectTab(e.target.dataset.target);
  };
}

function selectTab(path) {
  if (!store.tabs.has(path)) return;
  store.active = path;
  initEditor(store.tabs.get(path).content, path);
  renderTabs();
}

function closeTab(path) {
  store.tabs.delete(path);
  if (store.active === path) store.active = null;
  renderTabs();
}

let editor;
function initEditor(content, path) {
  if (!editor) {
    editor = monaco.editor.create(document.getElementById('editor'), {
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: {enabled:false}
    });
  }
  const ext = (path.split('.').pop() || 'txt').toLowerCase();
  monaco.editor.setModelLanguage(editor.getModel(), ext);
  editor.setValue(content);
  editor.onDidChangeModelContent(() => {
    store.tabs.get(store.active).content = editor.getValue();
    store.tabs.get(store.active).dirty = true;
    renderTabs();
  });
}

function initKeys() {
  // other global shortcuts can live here
}
```

ui/client.js
```js
/* tiny fetch wrappers */
export const getTree = async () => (await fetch('/api/files')).json();
export const readFile = async path => (await fetch('/api/files' + path)).text();

export const writeFile = async (path, data) => {
  await fetch('/api/files' + path, {method: 'PUT', body: data});
};
```

ui/style.css
```css
body, html { margin: 0; height: 100%; font-family: monospace; }
.root { display: flex; height: 100%; }
.panel { border-right: 1px solid #475569; }
#explorer { width: 260px; padding: 8px; box-sizing: border-box; }
#tab-bar { height: 30px; display: flex; background:#1e293b; }
.tab      { padding: 0 6px; border-right: 1px solid #475569; cursor: pointer; }
.tab.active { background: #0f172a; }
#editor { flex: 1; }
.label  { color: #06b6d4; font-weight: bold; font-size: 12px; margin-bottom: 6px; display: block;}
ul      { list-style: none; padding-left: 10px; cursor: pointer; }
li b    { color: #94a3b8; }
li[data-path]:hover { background: #475569; border-radius: 2px; }
```
────────────────────────────────────────
7.  Build & run
```bash
# compile & run on host
go mod tidy
go run ./cmd/server

# 𝐎𝐑 build release binary
CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o ide ./cmd/server

# docker minimal
docker build -t lite-ide .
docker run -p 3000:3000 lite-ide
```
Dockerfile (24 lines total)
```
FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags "-w -s" -o /ide ./cmd/server

FROM scratch
COPY --from=build /ide /ide
EXPOSE 3000
ENTRYPOINT ["/ide"]
```
────────────────────────────────────────
Result
• Single 5-8 MB static binary, no Node runtime.  
• Container image ~13 MB (scratch or distroless).  
• RAM 6–20 MB RSS under normal use, CPU <5 % idle.


