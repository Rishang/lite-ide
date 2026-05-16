package lsp

import (
	"io"
	"log"
	"net/http"
	"os/exec"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  65536,
	WriteBufferSize: 65536,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

// Language server commands: lang -> server_name -> command args
var servers = map[string]map[string][]string{
	"python": {
		"pyright": {"pyright-langserver", "--stdio"},
		"ruff":    {"ruff", "server"},
	},
	"go":         {"gopls": {"gopls", "serve"}},
	"rust":       {"rust-analyzer": {"rust-analyzer"}},
	"bash":       {"bash-language-server": {"bash-language-server", "start"}},
	"java":       {"jdtls": {"jdtls"}},
	"c":          {"clangd": {"clangd"}},
	"cpp":        {"clangd": {"clangd"}},
	"typescript": {"typescript-language-server": {"typescript-language-server", "--stdio"}},
	"javascript": {"typescript-language-server": {"typescript-language-server", "--stdio"}},
}

func Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		lang := r.URL.Query().Get("lang")
		serverName := r.URL.Query().Get("server") // optional: pick specific server

		langServers, ok := servers[lang]
		if !ok {
			http.Error(w, "unsupported language: "+lang, http.StatusBadRequest)
			return
		}

		// Pick the requested server, or first available
		var args []string
		if serverName != "" {
			args, ok = langServers[serverName]
			if !ok {
				http.Error(w, "unknown server: "+serverName, http.StatusBadRequest)
				return
			}
		} else {
			for _, a := range langServers {
				args = a
				break
			}
		}

		if _, err := exec.LookPath(args[0]); err != nil {
			http.Error(w, "language server not found: "+args[0], http.StatusServiceUnavailable)
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("[lsp] websocket upgrade failed: %v", err)
			return
		}
		defer conn.Close()

		cmd := exec.Command(args[0], args[1:]...)
		stdin, err := cmd.StdinPipe()
		if err != nil {
			log.Printf("[lsp] stdin pipe failed: %v", err)
			return
		}
		stdout, err := cmd.StdoutPipe()
		if err != nil {
			log.Printf("[lsp] stdout pipe failed: %v", err)
			return
		}

		if err := cmd.Start(); err != nil {
			log.Printf("[lsp] failed to start %s: %v", args[0], err)
			return
		}
		log.Printf("[lsp] started %s for %s", args[0], lang)

		var wg sync.WaitGroup
		wg.Add(2)

		go func() {
			defer wg.Done()
			buf := make([]byte, 65536)
			for {
				n, err := stdout.Read(buf)
				if err != nil {
					if err != io.EOF {
						log.Printf("[lsp] stdout read error: %v", err)
					}
					conn.WriteMessage(websocket.CloseMessage, nil)
					return
				}
				if err := conn.WriteMessage(websocket.TextMessage, buf[:n]); err != nil {
					return
				}
			}
		}()

		go func() {
			defer wg.Done()
			for {
				_, msg, err := conn.ReadMessage()
				if err != nil {
					stdin.Close()
					return
				}
				if _, err := stdin.Write(msg); err != nil {
					return
				}
			}
		}()

		wg.Wait()
		cmd.Process.Kill()
		cmd.Wait()
		log.Printf("[lsp] %s stopped", args[0])
	})
}
