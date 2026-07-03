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
}

export default function EvidenceMultiSelect({
  value,
  options,
  onChange,
  compact = false,
  label,
  open,
  onOpenChange,
}: EvidenceMultiSelectProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
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
    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      top: rect.bottom + 4,
      width: rect.width,
      minWidth: 240,
      zIndex: 2000,
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
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setOpenState(!isOpen);
        }}
        className={`w-full rounded text-left text-xs text-gray-700 focus:outline-none cursor-pointer ${
          compact
            ? "h-10 px-3 border-0 bg-transparent"
            : "h-10 px-2.5 border border-gray-300 bg-white focus:border-gray-450"
        } overflow-hidden max-w-full`}>
        <span className="block w-full truncate pr-5 font-semibold">{displayValue || ""}</span>
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="rounded border border-gray-300 bg-white shadow-lg">
          <div className="max-h-44 overflow-y-auto py-1">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleValue(option);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs break-all cursor-pointer ${
                  selectedValues.includes(option)
                    ? "bg-gray-200 text-gray-900 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}>
                {selectedValues.includes(option) && <span className="mr-1">✓   </span>}
                {option}
              </button>
            ))}
            {options.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-500">No files available</div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
