"use client";

import React from "react";
import { createPortal } from "react-dom";

interface Option {
    label: string;
    value: string;
    optionClass?: string;
}

interface ResultSingleSelectProps {
    value: string;
    options: Option[];
    onChange: (value: string) => void;
    className?: string;
    disabled?: boolean;
    open?: boolean;
    onOpenChange?: (nextOpen: boolean) => void;
    openOnClick?: boolean;
}

export default function ResultSingleSelect({
    value,
    options,
    onChange,
    className = "",
    disabled = false,
    open,
    onOpenChange,
    openOnClick = true,
}: ResultSingleSelectProps) {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const isControlled = open !== undefined;
    const isOpen = isControlled ? Boolean(open) : internalOpen;
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const dropdownRef = React.useRef<HTMLDivElement | null>(null);
    const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});

    const setOpenState = React.useCallback(
        (nextOpen: boolean) => {
            if (!isControlled) {
                setInternalOpen(nextOpen);
            }
            onOpenChange?.(nextOpen);
        },
        [isControlled, onOpenChange]
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
        const computedStyle = window.getComputedStyle(rootRef.current);
        setDropdownStyle({
            position: "fixed",
            left: rect.left,
            top: rect.bottom,
            width: rect.width,
            minWidth: 100,
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

    const handleSelect = (selectedValue: string) => {
        onChange(selectedValue);
        setOpenState(false);
    };

    const displayLabel = options.find((o) => o.value === value)?.label || value;

    return (
        <div ref={rootRef} className="relative w-full h-10">
            <button
                type="button"
                draggable={false}
                onClick={(event) => {
                    if (openOnClick === false) {
                        return;
                    }
                    event.stopPropagation();
                    if (disabled) return;
                    setOpenState(!isOpen);
                }}
                onDoubleClick={(event) => {
                    if (disabled) return;
                    event.stopPropagation();
                    setOpenState(true);
                }}
                className={`w-full h-full text-left focus:outline-none flex items-center select-none ${
                    disabled ? "cursor-default" : "cursor-pointer"
                } ${className}`}
            >
                <span draggable={false} className="block w-full truncate select-none">{displayLabel}</span>
            </button>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    data-portal-dropdown="true"
                    style={dropdownStyle}
                    className="border border-gray-300 bg-white overflow-hidden flex flex-col shadow-lg"
                >
                    <div className="max-h-44 overflow-y-auto py-1">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onMouseDown={(event) => event.stopPropagation()}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    handleSelect(option.value);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs cursor-pointer font-semibold transition-colors ${value === option.value
                                        ? "bg-gray-100"
                                        : "hover:bg-gray-50"
                                    } ${option.optionClass || "text-gray-700"}`}
                            >
                                {option.label || "\u00A0"}
                            </button>
                        ))}
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}