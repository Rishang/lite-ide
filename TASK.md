# Task: Creating a WEB IDE

Here is a complete, check-list–style TODO that covers everything we'll need to build your clean, lite-looking web IDE in Next.js and GO. Review it; when you're happy just reply and I'll start generating the code.

Go code in `src` and Next.js code in `ui` directory.

## Current Implementation Status

The Lite IDE is now a **fully functional single-binary web IDE** with the following architecture:

### Backend (Go)
- **Single binary** (< 8 MB) that serves both Web UI and REST API
- **Real filesystem integration** with file watching via fsnotify
- **WebSocket terminal** with PTY support
- **Server-Sent Events** for real-time file tree updates
- **CORS support** for cross-origin requests

### Frontend (React/Next.js)
- **Monaco Editor** with syntax highlighting and themes
- **Resizable panels** for file explorer and terminal
- **Tab management** with dirty state tracking
- **Configurable UI** via environment variables
- **Keyboard shortcuts** (Ctrl+S, Ctrl+`)
- **Dark theme** with modern UI

========  COMPLETED FEATURES  ================================================
Phase 0  – Skeleton & single-binary ✅
[✅] go.mod `lite-ide` + `//go:embed ui/build`  
[✅] Dockerfile min-4-stage (scratch size < 15 MB)  
[✅] One Git tag `v0.1.0` set  

Phase 1  – REST API contract (path is URL-param **root**) ✅
──────────────────────────────────────────────────────
GET    /api/files?root={{root}}                   → JSON-tree  
GET    /api/files{path}?root={{root}}             → 200/file or 404  
PUT    /api/files{path}?root={{root}}             → 204 (create/overwrite)  
DELETE /api/files{path}?root={{root}}             → 204  
PATCH  /api/files/rename?root={{root}}&old={old}&new={new} → 204  
POST   /api/files/mkdir?root={{root}}&path={path} → 204  
GET    /api/watch?root={{root}}                   → SSE for real-time updates  
POST   /api/expand?root={{root}}                  → Expand folder for lazy loading  

Phase 2  – Go backend ✅
a. `src/main.go`  – HTTP server with CORS + WebSocket + SSE  
b. `src/internal/vfs/vfs.go` – Real filesystem operations with skip directories  
c. `src/internal/terminal/terminal.go` – WebSocket PTY terminal  
d. `src/internal/web/embed.go` – Embedded UI + API handlers  
e. Live reload of tree when folders added externally (fsnotify) ✅  

Phase 3  – UI Monaco **language colourisation** ✅
a. Dynamic language detection based on file extensions  
b. Monaco editor with syntax highlighting  
c. Dark theme integration  
d. Language-specific themes via Monaco loader  

Phase 4  – CRUD glue on FE side ✅
a. FileExplorer:  
   - File tree with lazy loading  
   - Context menu for file operations  
   - Real-time updates via SSE  
b. TabBar: Dirty state tracking with visual indicators  
c. Editor: Monaco integration with save on Ctrl+S  
d. Terminal: WebSocket PTY with resize support  

Phase 5  – Advanced Features ✅
[✅] Resizable panels (file explorer + terminal)  
[✅] Configurable panel visibility via environment variables  
[✅] Keyboard shortcuts (Ctrl+` for terminal toggle)  
[✅] Server-Sent Events for real-time file watching  
[✅] WebSocket terminal with PTY support  
[✅] Skip directories (node_modules, .git, etc.)  
[✅] Error handling and reconnection logic  

========  CURRENT FILE / FOLDER TREE  ==========================================
lite-ide/
│  go.mod
│  Dockerfile
│  Taskfile.yml
│  README.md
│
├─src/
│  ├─main.go                    # HTTP server entry point
│  ├─go.mod
│  ├─go.sum
│  └─internal/
│     ├─vfs/
│     │  └─vfs.go              # Real filesystem operations
│     ├─web/
│     │  └─embed.go            # Embedded UI + API handlers
│     └─terminal/
│        └─terminal.go         # WebSocket PTY terminal
│
├─ui/
│  ├─src/
│  │  ├─app/
│  │  │  ├─layout.tsx          # Root layout
│  │  │  ├─page.tsx            # Main IDE component
│  │  │  └─globals.css         # Global styles
│  │  ├─components/
│  │  │  ├─Editor.tsx          # Monaco editor wrapper
│  │  │  ├─FileExplorer.tsx    # File tree component
│  │  │  ├─TabBar.tsx          # Tab management
│  │  │  ├─Terminal.tsx        # xterm.js wrapper
│  │  │  ├─TerminalPanel.tsx   # Terminal panel
│  │  │  └─ResizablePanel.tsx  # Resizable panel component
│  │  ├─types/
│  │  │  └─file.ts             # FileNode type definitions
│  │  ├─utils/
│  │  │  ├─config.ts           # Configuration system
│  │  │  └─utils.ts            # Utility functions
│  │  └─lib/
│  │     └─common.ts           # Language detection & themes
│  ├─package.json
│  ├─next.config.js
│  ├─tailwind.config.js
│  └─tsconfig.json
│
└─build/                        # Output directory for binary
   └─ide                        # Single binary executable
=============================================================================

========  API ENDPOINTS IMPLEMENTATION  ======================================
Backend API (src/internal/web/embed.go):

1. **File Tree**: `GET /api/files?root={path}`
   - Returns JSON tree of files and folders
   - Skips node_modules, .git, .next, etc.
   - Supports lazy loading for large directories

2. **File Operations**: 
   - `GET /api/files{path}?root={path}` - Read file content
   - `PUT /api/files{path}?root={path}` - Write file content
   - `DELETE /api/files{path}?root={path}` - Delete file/folder
   - `PATCH /api/files/rename?root={path}&old={old}&new={new}` - Rename
   - `POST /api/files/mkdir?root={path}&path={folder}` - Create folder

3. **Real-time Updates**: `GET /api/watch?root={path}`
   - Server-Sent Events for file tree updates
   - Uses fsnotify for file system monitoring
   - Automatic reconnection on connection loss

4. **Terminal**: `/terminal` (WebSocket)
   - PTY-based terminal with shell support
   - Resize support via WebSocket messages
   - Environment variable support for shell selection

========  FRONTEND FEATURES  ===============================================
UI Components (ui/src/):

1. **Main IDE** (`app/page.tsx`):
   - Configurable panel visibility
   - Resizable file explorer and terminal
   - Keyboard shortcuts (Ctrl+`, Ctrl+S)
   - SSE connection for real-time updates

2. **File Explorer** (`components/FileExplorer.tsx`):
   - Tree view with folder expansion
   - Context menu for file operations
   - Minimize/expand functionality
   - Real-time updates via SSE

3. **Editor** (`components/Editor.tsx`):
   - Monaco editor integration
   - Syntax highlighting
   - Language detection
   - Save on Ctrl+S

4. **Terminal** (`components/Terminal.tsx`):
   - xterm.js integration
   - WebSocket connection to PTY
   - Resize support
   - Focus management

5. **Configuration** (`utils/config.ts`):
   - Environment variable support
   - Panel visibility flags
   - API endpoint configuration

========  CONFIGURATION SYSTEM  ============================================
Environment Variables:

```bash
# API endpoint for backend communication
NEXT_PUBLIC_API_ENDPOINT=http://localhost:3000

# WebSocket host for terminal connections  
NEXT_PUBLIC_WS_HOST=ws://localhost:3000

# Panel visibility (set to "false" to hide)
NEXT_PUBLIC_SHOW_EDITOR=true
NEXT_PUBLIC_SHOW_TERMINAL=true
```

Panel Logic:
- **showEditor**: Controls both file explorer and editor visibility
- **showTerminal**: Controls terminal panel visibility
- When editor is hidden, terminal takes full height
- File explorer only shows when editor is present

========  BUILD SYSTEM  ===================================================
Taskfile.yml Commands:

- `task ui:dev` - Run the Next.js UI (development)
- `task ui:build` - Build the Next.js UI to static files
- `task go:build` - Build single binary with embedded UI
- `task go:dev` - Run the built binary (development)
- `task build` - Build the project (ui:build + go:build)

Build Process:
1. Next.js UI builds to `ui/out/`
2. Go embeds `ui/out/` into binary
3. Single binary created in `build/ide`

========  DEPLOYMENT  =====================================================
Docker Support:
```bash
docker build -t lite-ide .
docker run -p 3000:3000 lite-ide
```

Single Binary:
```bash
task build
./build/ide
```

Development:
```bash
task ui:dev  # Terminal 1
task go:dev  # Terminal 2
```

========  FUTURE ENHANCEMENTS  ===========================================
Potential improvements:

1. **Multi-language Support**:
   - Enhanced language detection
   - Language-specific snippets
   - Custom themes per language

2. **Advanced Features**:
   - Git integration
   - Search and replace
   - Multiple cursors
   - Code formatting

3. **Performance**:
   - Virtual scrolling for large file trees
   - Lazy loading for large files
   - Memory optimization

4. **User Experience**:
   - Settings panel
   - Keyboard shortcuts modal
   - File search
   - Command palette

The Lite IDE is now a fully functional, single-binary web IDE with real filesystem integration, terminal support, and a modern React UI. It provides a complete development environment in a portable executable.


