import React from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

interface TableHeaderProps {
  isExpanded: boolean;
  totalSamples: number;
  totalErrors: number;
  title: string;
}

export default function TableHeader({
  isExpanded,
  totalSamples,
  totalErrors,
  title,
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
          <span className="text-xs font-semibold text-gray-500">
            Total Sample
          </span>
          <div className="w-12 py-1 bg-white border border-gray-200 rounded text-center text-xs font-bold text-gray-700 shadow-2xs">
            {totalSamples}
          </div>
        </div>

        {/* Total Errors */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">
            Total Errors
          </span>
          <div className="w-12 py-1 bg-white border border-gray-200 rounded text-center text-xs font-bold text-gray-700 shadow-2xs">
            {totalErrors}
          </div>
        </div>
      </div>
    </div>
  );
}
