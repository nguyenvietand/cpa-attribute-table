"use client";

import React, { useState, useEffect, useRef } from "react";
import Dialog from "@mui/material/Dialog";

interface CellTextDialogProps {
  open: boolean;
  title: string;
  initialValue: string;
  onClose: () => void;
  onSave: (value: string) => void;
  readOnly?: boolean;
}

export default function CellTextDialog({
  open,
  title,
  initialValue,
  onClose,
  onSave,
  readOnly = false,
}: CellTextDialogProps) {
  const [text, setText] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const placeCursorAtEnd = () => {
    if (textareaRef.current) {
      const len = textareaRef.current.value.length;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(len, len);
    }
  };

  useEffect(() => {
    setText(initialValue);
    if (open) {
      const timer = setTimeout(placeCursorAtEnd, 50);
      return () => clearTimeout(timer);
    }
  }, [initialValue, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) {
      onClose();
      return;
    }
    onSave(text);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm">
      <div className="p-6 bg-white rounded-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4 shrink-0">
          <h3 className="text-base font-bold text-gray-800">
            {readOnly ? `View Cell: ${title}` : `Edit Cell: ${title}`}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-650 text-xl font-bold cursor-pointer leading-none p-1 transition-colors">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {title}
            </label>
            <textarea
              ref={textareaRef}
              rows={6}
              value={text}
              readOnly={readOnly}
              onChange={(e) => !readOnly && setText(e.target.value)}
              onFocus={(e) => {
                const len = e.currentTarget.value.length;
                e.currentTarget.setSelectionRange(len, len);
              }}
              onKeyDown={(e) => {
                if (readOnly) return;
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  onSave(text);
                }
              }}
              className={`w-full text-xs font-medium border border-gray-300 rounded px-3 py-2 resize-y min-h-[140px] ${
                readOnly
                  ? "bg-gray-50 text-gray-700 outline-none select-text cursor-default"
                  : "bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              }`}
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 pt-4 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]">
              {readOnly ? "Close" : "Cancel"}
            </button>
            {!readOnly && (
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-[#C00000] hover:bg-[#A00000] rounded transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]">
                Save Changes
              </button>
            )}
          </div>
        </form>
      </div>
    </Dialog>
  );
}
