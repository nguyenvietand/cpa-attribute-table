"use client";

import React, { useState, useLayoutEffect, useRef } from "react";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";

interface ExcelCellEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExpand?: () => void;
  prefix?: React.ReactNode;
  placeholder?: string;
}

export default function ExcelCellEditor({
  value,
  onChange,
  onExpand,
  prefix,
  placeholder,
}: ExcelCellEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    adjustHeight();
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
      onChange(newVal);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1;
          adjustHeight();
        }
      });
      return;
    }

    // Escape: exit edit mode / blur
    if (e.key === "Escape") {
      e.preventDefault();
      textareaRef.current?.blur();
      return;
    }
  };

  return (
    <div
      ref={containerRef}
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

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          placeholder={placeholder}
          onFocus={() => setIsEditing(true)}
          onBlur={(e) => {
            if (!containerRef.current?.contains(e.relatedTarget as Node)) {
              setIsEditing(false);
            }
          }}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full text-xs font-medium text-gray-700 bg-transparent border-0 p-0 focus:ring-0 outline-none resize-none select-text"
          style={{
            height: isEditing ? undefined : "20px",
            overflowY: isEditing ? "auto" : "hidden",
            lineHeight: "20px",
            userSelect: "text",
          }}
        />

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
                ? "opacity-70 hover:opacity-100 mt-0.5"
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
