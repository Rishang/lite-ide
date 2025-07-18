package terminal

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/exec"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type resizeMessage struct {
	Type string `json:"type"`
	Cols uint16 `json:"cols"`
	Rows uint16 `json:"rows"`
}

func New() (http.Handler, error) {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/terminal" {
			http.NotFound(w, r)
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("failed to upgrade websocket: %v", err)
			return
		}
		defer conn.Close()

		// Get shell from environment, fallback to common shells
		shell := os.Getenv("SHELL")
		if shell == "" {
			shell = "/bin/bash"
			if _, err := os.Stat("/bin/zsh"); err == nil {
				shell = "/bin/zsh"
			}
		}

		log.Printf("Starting shell: %s", shell)
		cmd := exec.Command(shell)
		cmd.Env = os.Environ()

		tty, err := pty.Start(cmd)
		if err != nil {
			log.Printf("failed to start pty: %v", err)
			return
		}
		defer tty.Close()

		log.Printf("PTY started successfully")

		// Read from tty and write to websocket
		go func() {
			defer func() {
				log.Printf("PTY read goroutine exiting")
			}()

			for {
				buf := make([]byte, 1024)
				n, err := tty.Read(buf)
				if err != nil {
					log.Printf("failed to read from pty: %v", err)
					conn.WriteMessage(websocket.CloseMessage, []byte{})
					return
				}
				if err := conn.WriteMessage(websocket.BinaryMessage, buf[:n]); err != nil {
					log.Printf("failed to write to websocket: %v", err)
					return
				}
			}
		}()

		// Read from websocket and write to tty
		for {
			msgType, message, err := conn.ReadMessage()
			if err != nil {
				log.Printf("failed to read from websocket: %v", err)
				return
			}

			if msgType == websocket.TextMessage {
				var resizeMsg resizeMessage
				if err := json.Unmarshal(message, &resizeMsg); err == nil && resizeMsg.Type == "resize" {
					// log.Printf("Resizing terminal to %dx%d", resizeMsg.Cols, resizeMsg.Rows)
					if err := pty.Setsize(tty, &pty.Winsize{Rows: resizeMsg.Rows, Cols: resizeMsg.Cols}); err != nil {
						log.Printf("failed to set pty size: %v", err)
					}
					continue
				}
			}

			if _, err := tty.Write(message); err != nil {
				log.Printf("failed to write to pty: %v", err)
				return
			}
		}
	}), nil
}
