"use client";

import React from "react";
import { createPortal } from "react-dom";
import { joinEvidenceValues, splitEvidenceValue } from "./evidenceUtils";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

interface EvidenceMultiSelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  compact?: boolean;
  label?: string;
  open?: boolean;
  onOpenChange?: (nextOpen: boolean) => void;
  disabled?: boolean;
  openOnClick?: boolean;
}

export default function EvidenceMultiSelect({
  value,
  options,
  onChange,
  compact = false,
  label,
  open,
  onOpenChange,
  disabled = false,
  openOnClick = true,
}: EvidenceMultiSelectProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);
  const selectedValues = React.useMemo(() => splitEvidenceValue(value), [value]);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? Boolean(open) : internalOpen;
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});

  const setOpenState = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  React.useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const filteredOptions = React.useMemo(() => {
    const baseOptions = disabled ? selectedValues : options;
    return baseOptions.filter((option) =>
      option.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [disabled, selectedValues, options, searchQuery]);

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (dropdownRef.current?.contains(event.target as Node)) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpenState(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [setOpenState]);

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
  }, []);

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

  const toggleValue = (nextValue: string) => {
    if (disabled) return;
    const nextSelected = selectedValues.includes(nextValue)
      ? selectedValues.filter((item) => item !== nextValue)
      : [...selectedValues, nextValue];
    onChange(joinEvidenceValues(nextSelected));
  };

  const displayValue = selectedValues.length > 0 ? joinEvidenceValues(selectedValues) : "";

  return (
    <div ref={rootRef} className="relative w-full">
      {label && <div className="text-[11px] text-gray-500 mb-1">{label}</div>}
      <button
        type="button"
        draggable={false}
        title={disabled ? "Click to view selected files" : undefined}
        onClick={(event) => {
          if (disabled) {
            event.stopPropagation();
            setOpenState(!isOpen);
            return;
          }
          if (openOnClick === false) {
            return;
          }
          event.stopPropagation();
          setOpenState(!isOpen);
        }}
        onDoubleClick={(event) => {
          if (disabled) return;
          event.stopPropagation();
          setOpenState(true);
        }}
        className={`w-full rounded text-left text-xs text-gray-700 focus:outline-none cursor-pointer select-none ${compact
          ? "h-10 px-3 border-0 bg-transparent"
          : "h-10 px-2.5 border border-gray-300 bg-white focus:border-gray-450"
          } overflow-hidden max-w-full`}>
        <span draggable={false} className="block w-full truncate pr-5 font-semibold select-none">{displayValue || ""}</span>
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          data-portal-dropdown="true"
          style={dropdownStyle}
          className="border border-gray-300 bg-white overflow-hidden flex flex-col shadow-lg">

          <div
            className="p-1.5 border-b border-gray-100 bg-gray-50"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              placeholder={disabled ? "Filter selected files..." : "Search..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-gray-700"
            />
          </div>

          <div className="max-h-44 overflow-y-auto py-1">
            {filteredOptions.map((option) => (
              disabled ? (
                <div
                  key={option}
                  onMouseDown={(event) => event.stopPropagation()}
                  className="w-full text-left px-3 py-1.5 text-xs break-all cursor-default bg-gray-50 text-gray-800 font-medium flex items-center">
                  <span className="mr-1.5 text-emerald-600 font-bold">✓</span>
                  <span>{option}</span>
                </div>
              ) : (
                <button
                  key={option}
                  type="button"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleValue(option);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs break-all cursor-pointer flex items-center ${selectedValues.includes(option)
                    ? "bg-gray-100 text-gray-900 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                    }`}>
                  {selectedValues.includes(option) && (
                    <span className="mr-1.5 text-emerald-600 font-bold shrink-0">✓</span>
                  )}
                  <span>{option}</span>
                </button>
              )
            ))}

            {filteredOptions.length === 0 && (
              <div className="px-3 py-3 text-xs text-gray-400 text-center italic">
                {disabled
                  ? selectedValues.length === 0
                    ? "No files attached"
                    : "No matches found"
                  : options.length === 0
                  ? "No files available"
                  : "No matches found"}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}