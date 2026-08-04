"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import Dialog from "@mui/material/Dialog";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

/* ---------------- Shared dropdown positioning hook ---------------- */
function useDropdownPosition(isOpen: boolean, rootRef: React.RefObject<HTMLDivElement | null>) {
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const updateDropdownPosition = React.useCallback(() => {
    if (!rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(rootRef.current);
    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      top: rect.bottom,
      width: rect.width,
      minWidth: 240,
      zIndex: 2000,
      fontFamily: computedStyle.fontFamily,
    });
  }, [rootRef]);

  React.useEffect(() => {
    if (!isOpen) return;

    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);

    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [isOpen, updateDropdownPosition]);

  return dropdownStyle;
}

/* ---------------- Row Single Select (From/To Row Number) ---------------- */
interface RowSingleSelectProps {
  value: string;
  options: number[];
  onChange: (value: string) => void;
  error?: boolean;
  placeholder?: string;
}

function RowSingleSelect({ value, options, onChange, error, placeholder }: RowSingleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);
  const dropdownStyle = useDropdownPosition(isOpen, rootRef);

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (dropdownRef.current?.contains(event.target as Node)) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between rounded text-left text-xs text-gray-700 focus:outline-none cursor-pointer h-10 px-2.5 border bg-white overflow-hidden max-w-full ${
          error
            ? "border-red-500"
            : "border-gray-300 focus:border-gray-450"
        }`}>
        <span className={`block w-full truncate pr-2 font-semibold ${!value ? "text-gray-400 font-normal" : ""}`}>
          {value || placeholder || "Select..."}
        </span>
        <KeyboardArrowDownIcon
          sx={{ fontSize: 18 }}
          className={`text-gray-500 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="border border-gray-300 bg-white overflow-hidden flex flex-col rounded shadow-lg">
          <div className="max-h-44 overflow-y-auto py-1">
            {options.map((row) => (
              <button
                key={row}
                type="button"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onChange(String(row));
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs break-all cursor-pointer ${
                  value === String(row)
                    ? "bg-gray-200 text-gray-900 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}>
                {value === String(row) && <span className="mr-1">✓   </span>}
                {row}
              </button>
            ))}

            {options.length === 0 && (
              <div className="px-3 py-3 text-xs text-gray-400 text-center italic">
                No rows available
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ---------------- Attribute Multi Select ---------------- */
interface AttributeOption {
  id: string;
  name: string;
}

interface AttributeMultiSelectProps {
  value: string[];
  options: AttributeOption[];
  onChange: (value: string[]) => void;
}

function AttributeMultiSelect({ value, options, onChange }: AttributeMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);
  const dropdownStyle = useDropdownPosition(isOpen, rootRef);

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (dropdownRef.current?.contains(event.target as Node)) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const toggleValue = (id: string) => {
    const nextSelected = value.includes(id)
      ? value.filter((item) => item !== id)
      : [...value, id];
    onChange(nextSelected);
  };

  const displayValue =
    value.length === 0
      ? ""
      : value.length === options.length
      ? "All attributes"
      : options
          .filter((attr) => value.includes(attr.id))
          .map((attr) => attr.name)
          .join(", ");

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-full flex items-center justify-between rounded text-left text-xs text-gray-700 focus:outline-none cursor-pointer h-10 px-2.5 border border-gray-300 bg-white focus:border-gray-450 overflow-hidden max-w-full">
        <span className={`block w-full truncate pr-2 font-semibold ${value.length === 0 ? "text-gray-400 font-normal" : ""}`}>
          {displayValue || "Select attributes..."}
        </span>
        <KeyboardArrowDownIcon
          sx={{ fontSize: 18 }}
          className={`text-gray-500 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="border border-gray-300 bg-white overflow-hidden flex flex-col rounded shadow-lg">

          <div className="max-h-44 overflow-y-auto py-1">
            {options.length > 0 && (
              <button
                type="button"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onChange(value.length === options.length ? [] : options.map((o) => o.id));
                }}
                className={`w-full text-left px-3 py-1.5 text-xs break-all cursor-pointer border-b border-gray-100 ${
                  value.length === options.length
                    ? "bg-gray-200 text-gray-900 font-semibold"
                    : "text-gray-700 hover:bg-gray-50 font-semibold"
                }`}>
                {value.length === options.length && <span className="mr-1">✓   </span>}
                Select All
              </button>
            )}

            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleValue(option.id);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs break-all cursor-pointer ${
                  value.includes(option.id)
                    ? "bg-gray-200 text-gray-900 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}>
                {value.includes(option.id) && <span className="mr-1">✓   </span>}
                {option.name}
              </button>
            ))}

            {options.length === 0 && (
              <div className="px-3 py-3 text-xs text-gray-400 text-center italic">
                No attributes available
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ---------------- Main Dialog ---------------- */
interface CopyAndPasteDialogProps {
  open: boolean;
  onClose: () => void;
  rowOptions: number[];
  attributeOptions: { id: string; name: string }[];
  onApply: (data: {
    fromRow: number;
    toRow: number;
    attributeIds: string[];
    pasteContent: string;
  }) => void;
}

export default function CopyAndPasteDialog({
  open,
  onClose,
  rowOptions,
  attributeOptions,
  onApply,
}: CopyAndPasteDialogProps) {
  const [fromRow, setFromRow] = useState("");
  const [toRow, setToRow] = useState("");
  const [attributeIds, setAttributeIds] = useState<string[]>([]);
  const [pasteContent, setPasteContent] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromRow || !toRow) {
      setError(true);
      return;
    }
    onApply({
      fromRow: parseInt(fromRow, 10),
      toRow: parseInt(toRow, 10),
      attributeIds,
      pasteContent,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <div className="p-6 bg-white rounded-lg">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
          <h3 className="text-lg font-bold text-gray-800">Copy Paste</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-650 text-xl font-bold cursor-pointer">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* From Row Number / To Row Number - cùng 1 hàng, style giống Attributes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase">
                From Row Number <span className="text-red-500">*</span>
              </label>
              <RowSingleSelect
                value={fromRow}
                options={rowOptions}
                onChange={(val) => {
                  setFromRow(val);
                  if (val && toRow) setError(false);
                }}
                error={error && !fromRow}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase">
                To Row Number <span className="text-red-500">*</span>
              </label>
              <RowSingleSelect
                value={toRow}
                options={rowOptions}
                onChange={(val) => {
                  setToRow(val);
                  if (fromRow && val) setError(false);
                }}
                error={error && !toRow}
              />
            </div>
          </div>
          {error && (!fromRow || !toRow) && (
            <span className="text-xs text-red-500 -mt-2 block">
              Please select both From Row and To Row
            </span>
          )}

          {/* Attributes - Multiselect Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase">
              Attributes
            </label>
            <AttributeMultiSelect
              value={attributeIds}
              options={attributeOptions}
              onChange={setAttributeIds}
            />
          </div>

          {/* Paste Sample Section */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase">
              Paste Sample Section
            </label>
            <textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              rows={4}
              className="w-full text-sm font-medium border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:border-gray-400 focus:ring-gray-400 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]">
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-[#C00000] hover:bg-[#A00000] rounded transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]">
              Apply
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
