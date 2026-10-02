import React from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

interface TableHeaderProps {
  isExpanded: boolean;
  totalSamples: number;
  totalErrors: number;
  title: string;
  onTotalSampleChange?: (value: number) => void;
  onTotalErrorChange?: (value: number) => void;
  disabled?: boolean;
}

export default function TableHeader({
  isExpanded,
  totalSamples,
  totalErrors,
  title,
  onTotalSampleChange,
  onTotalErrorChange,
  disabled = false,
}: TableHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full select-none">
      {/* Left Side: Chevron & Title */}
      <div className="flex items-center gap-3">
        <KeyboardArrowDownIcon
          className={`text-gray-500 transition-transform duration-200 ${
            isExpanded ? "transform rotate-0" : "transform -rotate-90"
          }`}
        />
        <span className="text-sm font-bold text-gray-800">
          {title}
        </span>
      </div>

      <div
        className="flex items-center gap-4 mt-2 sm:mt-0"
        onClick={(e) => e.stopPropagation()} 
      >
        {/* Total Sample */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
            Total Samples
          </span>
          <input
            type="number"
            min={0}
            value={totalSamples}
            disabled={disabled}
            readOnly={disabled}
            onFocus={(e) => !disabled && e.target.select()}
            onClick={(e) => !disabled && (e.target as HTMLInputElement).select()}
            onChange={(e) => {
              if (disabled) return;
              if (e.target.value === "") {
                onTotalSampleChange?.(0);
                return;
              }
              const val = Number(e.target.value);
              e.target.value = String(val);
              onTotalSampleChange?.(val);
            }}
            onBlur={(e) => {
              if (disabled) return;
              if (e.target.value === "") {
                e.target.value = "0";
                onTotalSampleChange?.(0);
              }
            }}
            className={`border rounded text-center text-xs font-bold shadow-2xs pl-2 pr-1 ${
              disabled
                ? "bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed"
                : "bg-white border-gray-200 text-gray-700 outline-none focus:border-blue-400"
            }`}
            style={{
              width: "56px",
              height: "32px",
              boxSizing: "border-box",
              fontSize: "12px",
              lineHeight: "16px",
            }}
          />
        </div>

        {/* Total Errors */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
            Total Errors
          </span>
          <input
            type="number"
            min={0}
            value={totalErrors}
            disabled={disabled}
            readOnly={disabled}
            onFocus={(e) => !disabled && e.target.select()}
            onClick={(e) => !disabled && (e.target as HTMLInputElement).select()}
            onChange={(e) => {
              if (disabled) return;
              if (e.target.value === "") {
                onTotalErrorChange?.(0);
                return;
              }
              const val = Number(e.target.value);
              e.target.value = String(val);
              onTotalErrorChange?.(val);
            }}
            onBlur={(e) => {
              if (disabled) return;
              if (e.target.value === "") {
                e.target.value = "0";
                onTotalErrorChange?.(0);
              }
            }}
            className={`border rounded text-center text-xs font-bold shadow-2xs pl-2 pr-1 ${
              disabled
                ? "bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed"
                : "bg-white border-gray-200 text-gray-700 outline-none focus:border-blue-400"
            }`}
            style={{
              width: "56px",
              height: "32px",
              boxSizing: "border-box",
              fontSize: "12px",
              lineHeight: "16px",
            }}
          />
        </div>
      </div>
    </div>
  );
}
