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
}

export default function ResultSingleSelect({
    value,
    options,
    onChange,
    className = "",
}: ResultSingleSelectProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const dropdownRef = React.useRef<HTMLDivElement | null>(null);
    const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});

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
        setIsOpen(false);
    };

    const displayLabel = options.find((o) => o.value === value)?.label || value;

    return (
        <div ref={rootRef} className="relative w-full h-10">
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={`w-full h-full text-left focus:outline-none cursor-pointer flex items-center ${className}`}
            >
                <span className="block w-full truncate">{displayLabel}</span>
            </button>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
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