"use client";

import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";

interface TableToolbarProps {
  onAddRowClick: () => void;
  onPasteClick: () => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  onCopySelection: () => void;
  onCopyAll: () => void;
  hasSelection: boolean;
  tableNames: string[];
  selectedTableName: string;
  onSelectedTableNameChange: (value: string) => void;
}

export default function TableToolbar({
  onAddRowClick,
  onPasteClick,
  onCopySelection,
  onCopyAll,
  hasSelection,
  tableNames,
  selectedTableName,
  onSelectedTableNameChange,
}: TableToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white border-b border-gray-200">
      {/* Left Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Add Row Button */}
        <button
          type="button"
          onClick={onAddRowClick}
          className="flex items-center gap-1 border border-red-200 text-[#C00000] px-3 py-1.5 rounded text-xs font-semibold hover:bg-red-50/50 active:scale-[0.98] transition-all cursor-pointer shadow-2xs">
          <AddIcon sx={{ fontSize: 14 }} />
          <span>Add Row</span>
        </button>

        {/* Paste from Excel Button */}
        <button
          type="button"
          onClick={onPasteClick}
          className="flex items-center gap-1 border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-xs font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
          title="Paste rows from Excel clipboard">
          <ContentPasteIcon sx={{ fontSize: 14 }} />
          <span>Paste from Excel</span>
        </button>

        {/* Copy Selection Button */}
        <button
          type="button"
          onClick={onCopySelection}
          disabled={!hasSelection}
          className={`flex items-center gap-1 border px-3 py-1.5 rounded text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer shadow-2xs ${
            hasSelection ?
              "border-emerald-300 text-emerald-700 bg-emerald-50/30 hover:bg-emerald-50"
            : "border-gray-200 text-gray-450 bg-gray-50/50 cursor-not-allowed"
          }`}
          title="Copy selected cells to clipboard">
          <ContentCopyIcon sx={{ fontSize: 14 }} />
          <span>Copy Selection</span>
        </button>

        {/* Copy All Button */}
        <button
          type="button"
          onClick={onCopyAll}
          className="flex items-center gap-1 border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-xs font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
          title="Copy entire table to clipboard">
          <ContentCopyIcon sx={{ fontSize: 14 }} />
          <span>Copy All</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <select
            value={selectedTableName}
            onChange={(e) => onSelectedTableNameChange(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded pl-3 pr-8 py-1.5 text-xs font-semibold text-gray-700 focus:outline-hidden focus:border-gray-400 focus:ring-1 focus:ring-gray-400 cursor-pointer shadow-2xs"
            style={{ width: 160 }}>
            {tableNames.length === 0 && <option value=""> </option>}
            {tableNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
          </div>
        </div>
        {/* Delete Icon Button */}
        <button
          type="button"
          className="p-1.5 text-gray-455 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer flex items-center justify-center"
          title="Delete Section">
          <DeleteIcon sx={{ fontSize: 16 }} />
        </button>
      </div>
    </div>
  );
}
