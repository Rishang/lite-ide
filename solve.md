# Terminal Resize Fix

## Problem

The xterm terminal did not correctly react when NanoIDE panels changed size. After adding automatic fitting, shell prompts started duplicating during width changes because every frontend column resize was forwarded to the backend PTY, causing the shell to receive repeated resize signals and redraw the prompt.

## Solution

- Added a `ResizeObserver` in `ui/src/components/Terminal.tsx` so the terminal reacts to its own container size, not only browser `window.resize` events.
- Replaced direct `fitAddon.fit()` resize behavior with `fitAddon.proposeDimensions()` so the frontend can control which dimensions actually change.
- Kept terminal columns stable after initial PTY setup. Width-only panel changes no longer resize the backend PTY columns.
- Still allows row changes to update the terminal and backend PTY, so vertical terminal resizing continues to work.
- Removed the duplicate `term.onResize` WebSocket resize sender, which was causing extra resize messages.

## Result

- Terminal UI now follows panel/container resize changes.
- Width resizing no longer spams shell prompt redraws.
- The backend PTY stays aligned with the visible terminal layout.
- The extra blank-line gap between the prompt path and prompt symbol is fixed by keeping xterm columns and PTY columns consistent.

## Verification

`task build` was used for validation during the session. The final user-tested behavior is confirmed fixed.
