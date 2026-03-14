"use client";

import { useState, useEffect } from "react";
import {
  Files,
  Terminal as TerminalIcon,
  Search,
  ChevronRight,
  PanelBottomClose,
  PanelBottom,
} from "lucide-react";
import { FileExplorer } from "@/components/FileExplorer";
import { Editor, MarkerData } from "@/components/Editor";
import { TabBar } from "@/components/TabBar";
import { ResizablePanel } from "@/components/ResizablePanel";
import { FileNode } from "@/types/file";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { config } from "@/utils/config";
import { getLanguageFromPath, getThemeForLanguage } from "@/lib/common";

const TerminalPanel = dynamic(
  () =>
    import("@/components/TerminalPanel").then((mod) => ({
      default: mod.TerminalPanel,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading terminal...
      </div>
    ),
  },
);

export function HomeContent() {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [tabs, setTabs] = useState<
    Map<string, { content: string; dirty: boolean }>
  >(new Map());
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>(".");
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(
    config.showEditor ? true : config.showTerminal,
  );
  const [isTerminalMinimized, setIsTerminalMinimized] = useState<boolean>(
    config.showEditor ? false : !config.showTerminal,
  );
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false);
  const [explorerWidth, setExplorerWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const [isExplorerMinimized, setIsExplorerMinimized] = useState(
    !config.showEditor,
  );
  const [lastExplorerWidth, setLastExplorerWidth] = useState(256);
  const [windowHeight, setWindowHeight] = useState(600);
  const [activePanel, setActivePanel] = useState<string>("files");
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const searchParams = useSearchParams();

  useEffect(() => {
    const pathParam = searchParams.get("p");
    setCurrentPath(pathParam || ".");
    refreshTree();
  }, [searchParams]);

  useEffect(() => {
    const updateWindowHeight = () => setWindowHeight(window.innerHeight);
    updateWindowHeight();
    window.addEventListener("resize", updateWindowHeight);
    return () => window.removeEventListener("resize", updateWindowHeight);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+` — toggle terminal
      if (e.ctrlKey && (e.key === "`" || e.code === "Backquote")) {
        e.preventDefault();
        if (!config.showEditor) {
          setIsTerminalOpen((prev) => !prev);
          setIsTerminalMinimized(false);
        } else {
          // Always exit maximized state when toggling via keyboard
          setIsTerminalMaximized(false);
          setIsTerminalMinimized((prev) => {
            const newMinimized = !prev;
            if (!newMinimized) {
              setTimeout(() => {
                window.dispatchEvent(new Event("focusTerminal"));
              }, 100);
            }
            return newMinimized;
          });
        }
      }

      // Ctrl+W — close active tab
      if ((e.ctrlKey || e.metaKey) && e.key === "w") {
        e.preventDefault();
        if (activeTab) closeTab(activeTab);
      }

      // Ctrl+B — toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setIsExplorerMinimized((prev) => {
          const newMinimized = !prev;
          if (newMinimized) {
            setLastExplorerWidth(explorerWidth);
            setExplorerWidth(0);
          } else {
            setExplorerWidth(lastExplorerWidth);
          }
          return newMinimized;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, explorerWidth, lastExplorerWidth]);

  // SSE for real-time file tree updates
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      if (eventSource) eventSource.close();

      eventSource = new EventSource(
        `${config.apiEndpoint}/api/watch?root=${encodeURIComponent(currentPath)}`,
      );

      eventSource.onmessage = (event) => {
        try {
          const newTree = JSON.parse(event.data) as FileNode[];
          setTree(newTree);
        } catch (error) {
          console.error("Error parsing SSE data:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE error:", error);
        setTimeout(() => {
          if (eventSource?.readyState === EventSource.CLOSED) connectSSE();
        }, 3000);
      };
    };

    connectSSE();
    return () => {
      if (eventSource) eventSource.close();
    };
  }, [currentPath]);

  useEffect(() => {
    const handleRefresh = () => refreshTree();
    window.addEventListener("refreshTree", handleRefresh);
    return () => window.removeEventListener("refreshTree", handleRefresh);
  }, []);

  // Explorer resize drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.max(200, Math.min(600, e.clientX - 48));
        setExplorerWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove, {
        passive: true,
      });
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const refreshTree = async () => {
    try {
      const response = await fetch(
        `${config.apiEndpoint}/api/files?root=${encodeURIComponent(currentPath)}`,
      );
      if (!response.ok)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      setTree(data);
    } catch (error) {
      console.error("Failed to load file tree:", error);
    }
  };

  const openFile = async (path: string) => {
    try {
      const normalizedPath = path.startsWith("/") ? path : "/" + path;
      const response = await fetch(
        `${config.apiEndpoint}/api/files${normalizedPath}?root=${encodeURIComponent(currentPath)}`,
      );
      if (!response.ok)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const content = await response.text();
      const newTabs = new Map(tabs);
      newTabs.set(path, { content, dirty: false });
      setTabs(newTabs);
      setActiveTab(path);
    } catch (error) {
      console.error("Failed to open file:", error);
    }
  };

  const saveFile = async (path: string, content: string) => {
    try {
      const normalizedPath = path.startsWith("/") ? path : "/" + path;
      const response = await fetch(
        `${config.apiEndpoint}/api/files${normalizedPath}?root=${encodeURIComponent(currentPath)}`,
        { method: "PUT", body: content },
      );
      if (!response.ok)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const newTabs = new Map(tabs);
      const tab = newTabs.get(path);
      if (tab) {
        tab.dirty = false;
        setTabs(newTabs);
      }
    } catch (error) {
      console.error("Failed to save file:", error);
    }
  };

  const closeTab = (path: string) => {
    const newTabs = new Map(tabs);
    newTabs.delete(path);
    setTabs(newTabs);
    if (activeTab === path) {
      const remaining = Array.from(newTabs.keys());
      setActiveTab(
        remaining.length > 0 ? remaining[remaining.length - 1] : null,
      );
    }
  };

  const updateTabContent = (path: string, content: string) => {
    const newTabs = new Map(tabs);
    const tab = newTabs.get(path);
    if (tab) {
      tab.content = content;
      tab.dirty = true;
      setTabs(newTabs);
    }
  };

  const handleFileRename = (oldPath: string, newPath: string) => {
    const newTabs = new Map(tabs);
    const tabData = newTabs.get(oldPath);
    if (tabData) {
      newTabs.delete(oldPath);
      newTabs.set(newPath, tabData);
      setTabs(newTabs);
      if (activeTab === oldPath) setActiveTab(newPath);
    }
  };

  const checkFileDirty = (path: string): boolean => {
    const tab = tabs.get(path);
    return tab ? tab.dirty : false;
  };

  const saveSpecificFile = async (path: string): Promise<void> => {
    const tab = tabs.get(path);
    if (tab) await saveFile(path, tab.content);
  };

  /**
   * Maximize the terminal panel.
   * Maximizing always un-minimizes first so the panel is actually visible.
   */
  const handleTerminalMaximize = () => {
    const nextMaximized = !isTerminalMaximized;
    setIsTerminalMaximized(nextMaximized);
    if (nextMaximized) {
      // Un-minimize when entering maximize so the panel is visible
      setIsTerminalMinimized(false);
    }
  };

  /**
   * Minimize (or un-minimize) the terminal.
   * Always exits maximized state — minimize and maximize are mutually exclusive.
   */
  const handleTerminalMinimizeToggle = () => {
    setIsTerminalMaximized(false);
    setIsTerminalMinimized((prev) => !prev);
  };

  const handlePathChange = (newPath: string) => {
    setCurrentPath(newPath);
    const url = new URL(window.location.href);
    url.searchParams.set("p", newPath);
    window.history.replaceState({}, "", url.toString());
  };

  const getBreadcrumbs = () => {
    if (!activeTab) return [];
    return activeTab.replace(/^\//, "").split("/");
  };

  const getFileName = (path: string) => path.split("/").pop() || path;

  return (
    <div className="flex h-screen bg-[#1e1e1e] text-white overflow-hidden">
      {/* Activity Bar */}
      {config.showEditor && (
        <div className="w-12 bg-[#333333] flex flex-col items-center py-1 flex-shrink-0 border-r border-[#252526]">
          <button
            className={`w-12 h-12 flex items-center justify-center transition-colors relative ${activePanel === "files"
              ? "text-white"
              : "text-[#858585] hover:text-white"
              }`}
            onClick={() => {
              if (activePanel === "files" && !isExplorerMinimized) {
                setIsExplorerMinimized(true);
                setLastExplorerWidth(explorerWidth);
                setExplorerWidth(0);
              } else {
                setActivePanel("files");
                if (isExplorerMinimized) {
                  setIsExplorerMinimized(false);
                  setExplorerWidth(lastExplorerWidth);
                }
              }
            }}
            title="Explorer (Ctrl+B)"
          >
            {activePanel === "files" && !isExplorerMinimized && (
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white" />
            )}
            <Files className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* File Explorer Sidebar */}
      {config.showEditor && !isExplorerMinimized && (
        <>
          <div
            style={{ width: `${explorerWidth}px` }}
            className="flex-shrink-0 transition-none"
          >
            <FileExplorer
              tree={tree}
              onFileOpen={openFile}
              onFileRename={handleFileRename}
              onCheckFileDirty={checkFileDirty}
              onSaveFile={saveSpecificFile}
              className="h-full"
              currentPath={currentPath}
              onPathChange={handlePathChange}
              onRefresh={refreshTree}
              showMinimizeButton={false}
              activeFilePath={activeTab}
            />
          </div>
          <div
            className="w-[3px] bg-transparent hover:bg-[#007acc] cursor-col-resize flex-shrink-0 transition-colors"
            onMouseDown={handleResizeStart}
          />
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Editor Area — hidden when terminal is maximized */}
        {config.showEditor && !isTerminalMaximized && (
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <TabBar
              tabs={Array.from(tabs.keys())}
              activeTab={activeTab}
              dirtyTabs={Array.from(tabs.entries())
                .filter(([_, tab]) => tab.dirty)
                .map(([path]) => path)}
              onTabSelect={setActiveTab}
              onTabClose={closeTab}
            />

            {/* Breadcrumbs */}
            {activeTab && (
              <div className="flex items-center px-4 py-1 bg-[#1e1e1e] border-b border-[#252526] text-xs">
                {getBreadcrumbs().map((part, index, arr) => (
                  <span key={index} className="flex items-center">
                    <span className="text-[#cccccc] hover:text-white cursor-pointer hover:underline">
                      {part}
                    </span>
                    {index < arr.length - 1 && (
                      <ChevronRight className="w-3 h-3 mx-1 text-[#666] flex-shrink-0" />
                    )}
                  </span>
                ))}
              </div>
            )}

            <div className="flex-1 min-h-0 min-w-0 bg-[#1e1e1e] overflow-hidden">
              {activeTab ? (
                <Editor
                  content={tabs.get(activeTab)?.content || ""}
                  path={activeTab}
                  language={getLanguageFromPath(activeTab)}
                  theme={getThemeForLanguage(getLanguageFromPath(activeTab))}
                  onChange={(content: string) =>
                    updateTabContent(activeTab, content)
                  }
                  onSave={() =>
                    saveFile(activeTab, tabs.get(activeTab)?.content || "")
                  }
                  onMarkersChange={setMarkers}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[#5a5a5a]">
                  <div className="text-6xl font-light mb-4 opacity-20">⌨</div>
                  <div className="text-lg font-light">Lite IDE</div>
                  <div className="text-sm mt-2 opacity-60">
                    Open a file from the explorer to start editing
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Terminal Panel */}
        {config.showTerminal && (
          <ResizablePanel
            defaultHeight={config.showEditor ? 300 : windowHeight}
            minHeight={32}
            maxHeight={windowHeight * 0.7}
            isMaximized={isTerminalMaximized}
            className={`
              ${isTerminalMinimized ? "hidden" : ""}
              ${isTerminalMaximized ? "flex-1" : ""}
            `}
            showResizeHandle={config.showEditor}
          >
            <TerminalPanel
              onMaximize={handleTerminalMaximize}
              markers={markers}
              activeFilePath={activeTab}
            />
          </ResizablePanel>
        )}

        {/* Status Bar */}
        {config.showEditor && (
          <div className="h-[22px] bg-[#007acc] flex items-center justify-between px-3 text-xs text-white flex-shrink-0 select-none">
            <div className="flex items-center gap-3">
              {activeTab && (
                <>
                  <span>
                    {getLanguageFromPath(activeTab).charAt(0).toUpperCase() +
                      getLanguageFromPath(activeTab).slice(1)}
                  </span>
                  <span>UTF-8</span>
                  <span>LF</span>
                </>
              )}
              {/* Minimize/restore toggle — always resets maximize state */}
              <button
                className="flex items-center gap-1 hover:bg-white/20 px-1 rounded transition-colors"
                onClick={handleTerminalMinimizeToggle}
                title="Toggle Terminal (Ctrl+`)"
              >
                {isTerminalMinimized ? (
                  <PanelBottom className="w-3 h-3" />
                ) : (
                  <PanelBottomClose className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
