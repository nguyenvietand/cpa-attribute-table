"use client";

import React, { useState, useLayoutEffect, useEffect, useRef } from "react";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";

interface ExcelCellEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExpand?: () => void;
  prefix?: React.ReactNode;
  placeholder?: string;
  isActive?: boolean;
  onNavigateDown?: () => void;
  onNavigateUp?: () => void;
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
  disabled?: boolean;
}

export default function ExcelCellEditor({
  value,
  onChange,
  onExpand,
  prefix,
  placeholder,
  isActive,
  onNavigateDown,
  onNavigateUp,
  onNavigateNext,
  onNavigatePrev,
  disabled = false,
}: ExcelCellEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // When cell loses active selection, automatically exit editing
  useEffect(() => {
    if (!isActive && isEditing) {
      setIsEditing(false);
    }
  }, [isActive, isEditing]);

  // Support F2 key to enter edit mode when cell is selected like Excel
  useEffect(() => {
    if (!isActive || isEditing || disabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        setIsEditing(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, isEditing, disabled]);

  const adjustHeight = () => {
    if (!textareaRef.current) return;
    if (isEditing) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      // Min 20px (1 line), max 150px (~6-7 lines)
      const targetHeight = Math.min(Math.max(scrollHeight, 20), 150);
      textareaRef.current.style.height = `${targetHeight}px`;
    } else {
      textareaRef.current.style.height = "20px";
    }
  };

  useLayoutEffect(() => {
    if (isEditing) {
      adjustHeight();
      if (textareaRef.current) {
        textareaRef.current.focus();
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) {
      adjustHeight();
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) {
      adjustHeight();
    }
  }, [isEditing, value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Alt + Enter or Ctrl + Enter: Insert newline in-place like Excel
    if (e.key === "Enter" && (e.altKey || e.ctrlKey)) {
      e.preventDefault();
      e.stopPropagation();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      const newVal = val.substring(0, start) + "\n" + val.substring(end);
      textarea.value = newVal;
      textarea.selectionStart = textarea.selectionEnd = start + 1;
      adjustHeight();
      onChange(newVal);
      return;
    }

    // Enter (without Alt/Ctrl): commit edit and navigate down (or up if Shift is pressed)
    if (e.key === "Enter" && !e.altKey && !e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      setIsEditing(false);
      if (e.shiftKey) {
        onNavigateUp?.();
      } else {
        onNavigateDown?.();
      }
      return;
    }

    // Tab: commit edit and navigate next (or prev if Shift is pressed)
    if (e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      setIsEditing(false);
      if (e.shiftKey) {
        onNavigatePrev?.();
      } else {
        onNavigateNext?.();
      }
      return;
    }

    // Escape: exit edit mode / blur
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setIsEditing(false);
      const cell = containerRef.current?.closest<HTMLElement>("td[data-row-id]");
      cell?.focus();
      return;
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => {
        if (isEditing) {
          e.stopPropagation();
          if (e.target !== textareaRef.current) {
            e.preventDefault();
            textareaRef.current?.focus();
          }
        }
      }}
      onClick={(e) => {
        if (isEditing) {
          e.stopPropagation();
          textareaRef.current?.focus();
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        setIsEditing(true);
      }}
      style={{
        position: "relative",
        width: "100%",
        height: "40px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          minHeight: "40px",
          height: isEditing ? "auto" : "40px",
          zIndex: isEditing ? 40 : 1,
          backgroundColor: isEditing ? "var(--color-blue-50, #eff6ff)" : "transparent",
          border: "none",
          boxShadow: isEditing
            ? "inset 0 0 0 2px var(--color-blue-600, #155dfb)"
            : "none",
          boxSizing: "border-box",
          display: "flex",
          alignItems: isEditing ? "flex-start" : "center",
          paddingLeft: "8px",
          paddingRight: "8px",
          paddingTop: isEditing ? "10px" : "0px",
          paddingBottom: isEditing ? "10px" : "0px",
        }}
        className="group"
      >
        {prefix && (
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginRight: "6px",
              marginTop: isEditing ? "1px" : "0px",
            }}
          >
            {prefix}
          </div>
        )}

        {isEditing ? (
          <textarea
            ref={textareaRef}
            autoFocus
            rows={1}
            value={value}
            placeholder={placeholder}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onBlur={(e) => {
              const related = e.relatedTarget as Node | null;
              if (related) {
                if (containerRef.current?.contains(related)) {
                  return;
                }
                const cell = containerRef.current?.closest("td[data-row-id]");
                if (cell && (cell === related || cell.contains(related))) {
                  return;
                }
              }
              setIsEditing(false);
            }}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full text-xs font-medium text-gray-700 bg-transparent border-0 p-0 focus:ring-0 outline-none resize-none select-text"
            style={{
              overflowY: "auto",
              lineHeight: "20px",
              userSelect: "text",
            }}
          />
        ) : (
          <div
            title={value || undefined}
            className="w-full text-xs font-medium text-gray-700 truncate select-none"
            style={{
              height: "20px",
              lineHeight: "20px",
            }}
          >
            {value ? (
              value.split(/\r?\n/).find((line) => line.trim().length > 0) || value.split(/\r?\n/)[0]
            ) : placeholder ? (
              <span className="text-gray-400 font-normal">{placeholder}</span>
            ) : (
              ""
            )}
          </div>
        )}

        {onExpand && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            className={`text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-0.5 rounded cursor-pointer shrink-0 transition-opacity ml-1.5 ${
              isEditing
                ? "opacity-70 hover:opacity-100"
                : "opacity-0 group-hover:opacity-100"
            }`}
            title="Expand"
          >
            <OpenInFullIcon sx={{ fontSize: 12 }} />
          </button>
        )}
      </div>
    </div>
  );
}
