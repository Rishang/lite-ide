"use client";

import { useState, useRef, useEffect, ReactNode } from "react";

interface ResizablePanelProps {
  children: ReactNode;
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  className?: string;
  showResizeHandle?: boolean;
  isMaximized?: boolean;
}

export function ResizablePanel({
  children,
  defaultHeight = 300,
  minHeight = 80,
  maxHeight = 800,
  className = "",
  showResizeHandle = true,
  isMaximized = false,
}: ResizablePanelProps) {
  const [height, setHeight] = useState(defaultHeight);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      const newHeight = Math.max(minHeight, Math.min(maxHeight, rect.bottom - e.clientY));
      setHeight(newHeight);
    };

    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, minHeight, maxHeight]);

  return (
    <div
      ref={panelRef}
      className={`flex flex-col ${className}`}
      style={isMaximized ? undefined : { height: `${height}px` }}
    >
      {/* Resize sash — matches VS Code's 4 px hit-target with a 1 px visual line */}
      {showResizeHandle && !isMaximized && (
        <div
          onMouseDown={e => { e.preventDefault(); setIsResizing(true); }}
          className="group relative h-[4px] shrink-0 cursor-ns-resize z-10"
        >
          {/* Visible line */}
          <div
            className={[
              "absolute inset-x-0 top-[1.5px] h-[1px] transition-colors duration-150",
              isResizing ? "bg-[#007fd4]" : "bg-[#333] group-hover:bg-[#007fd4]",
            ].join(" ")}
          />
          {/* Drag grip dots */}
          <div
            className={[
              "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-[3px] transition-opacity duration-150",
              isResizing ? "opacity-100" : "opacity-0 group-hover:opacity-60",
            ].join(" ")}
          >
            {[0, 1, 2].map(i => (
              <span key={i} className="w-[3px] h-[3px] rounded-full bg-[#007fd4]" />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}