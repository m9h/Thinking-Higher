"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface ArtifactPanelProps {
  src: string;
  title?: string;
}

const COLLAPSED_WIDTH = 36;
const DEFAULT_WIDTH = 420;
const MIN_WIDTH = 280;
const MAX_WIDTH = 1400;

export default function ArtifactPanel({ src, title = "Prototype" }: ArtifactPanelProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Refs track drag state without triggering re-renders mid-drag
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(DEFAULT_WIDTH);
  const panelRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartWidth.current = width;
    setDragging(true);
  }, [width]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      // Update the panel width directly on the DOM element — no React re-render per pixel
      const delta = dragStartX.current - e.clientX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.current + delta));
      if (panelRef.current) {
        panelRef.current.style.width = `${next}px`;
      }
    };

    const onUp = (e: MouseEvent) => {
      // Commit the final width to React state — this is the "fix" moment
      const delta = dragStartX.current - e.clientX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.current + delta));
      setWidth(next);
      setExpanded(false);
      setDragging(false);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  function toggleExpand() {
    if (expanded) {
      setWidth(DEFAULT_WIDTH);
      setExpanded(false);
    } else {
      const expandedWidth = Math.round(window.innerWidth * 0.7);
      setWidth(Math.min(MAX_WIDTH, expandedWidth));
      setExpanded(true);
    }
    setCollapsed(false);
  }

  function toggleCollapse() {
    setCollapsed((c) => !c);
    setExpanded(false);
  }

  const panelWidth = collapsed ? COLLAPSED_WIDTH : width;

  return (
    <div
      ref={panelRef}
      className="artifact-panel"
      style={{
        width: panelWidth,
        // No transition while dragging — smooth animation only on collapse/expand clicks
        transition: dragging ? "none" : "width 0.22s cubic-bezier(0.22,1,0.36,1)",
        flexShrink: 0,
        position: "relative",
        // Block pointer events on the iframe while dragging so it doesn't steal mousemove
        userSelect: dragging ? "none" : undefined,
      }}
    >
      {/* iframe pointer-events blocker during drag */}
      {dragging && (
        <div style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          cursor: "ew-resize",
        }} />
      )}

      {/* Drag handle */}
      {!collapsed && (
        <div
          onMouseDown={onMouseDown}
          className={`proto-drag-handle${dragging ? " dragging" : ""}`}
          title="Drag to resize"
          style={{ cursor: "ew-resize" }}
        />
      )}

      {/* Toolbar */}
      <div className="artifact-toolbar">
        {!collapsed && (
          <>
            <span className="artifact-filename">✦ {title}</span>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#555" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#555" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#555" }} />
              <button className="proto-expand-btn" onClick={toggleExpand}>
                {expanded ? "⊟ Collapse" : "⊞ Expand"}
              </button>
            </div>
          </>
        )}
        <button
          onClick={toggleCollapse}
          title={collapsed ? "Show prototype" : "Hide prototype"}
          className="artifact-collapse-btn"
          style={{ marginLeft: collapsed ? 0 : 8 }}
        >
          {collapsed ? "◀" : "▶"}
        </button>
      </div>

      {/* iframe */}
      {!collapsed && (
        <iframe
          src={src}
          title={title}
          style={{ flex: 1, border: "none", width: "100%", background: "#111" }}
          sandbox="allow-scripts allow-same-origin"
        />
      )}
    </div>
  );
}
