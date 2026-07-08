import { useRef, useEffect, useState } from "react";
import { SampleRow, Attribute, ColumnWidths } from "./index";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { mergeEvidenceOptions, splitEvidenceValue, joinEvidenceValues } from "./evidenceUtils";
import EvidenceMultiSelect from "./EvidenceMultiSelect";


interface TableGridProps {
  rows: SampleRow[];
  attributes: Attribute[];
  rowStartIndex: number;
  onAttrChange: (id: number, attributeId: string, value: string) => void;
  onDeleteAttribute: (id: string) => void;
  onResultChange: (id: number, value: "Pass" | "Fail" | "") => void;
  onEvidenceChange: (id: number, value: string) => void;
  evidenceOptions: string[];
  onWeekChange: (id: number, value: string) => void;
  onCommentChange: (id: number, value: string) => void;
  onAddAttribute: (targetIndex?: number) => void;
  onUpdateAttribute: (id: string, updatedFields: Partial<Attribute>) => void;
  columnHeaders: {
    week: string;
    evidence: string;
    result: string;
    comment: string;
  };
  onUpdateColumnHeader: (
    key: "week" | "evidence" | "result" | "comment",
    value: string,
  ) => void;
  onEditClick: (row: SampleRow) => void;
  onDeleteRow: (id: number) => void;
  maxHeight?: string | number;
  columnWidths?: ColumnWidths;
  onAddRow: () => void;
  onColumnResize?: (columnId: string, newWidth: number) => void;
  selectedRowIds: Set<number>;
  onToggleRowSelection: (id: number) => void;
  onToggleAllSelection: () => void;
  selectionMode: boolean;
  activeRowId: number | null;
  activeColumnId: string | null;
  onCellMouseDown: (e: React.MouseEvent, rowId: number, colId: string) => void;
  onCellMouseEnter: (rowId: number, colId: string) => void;
  isCellSelected: (rowId: number, colId: string) => boolean;
  selectionRange: {
    start: { rowId: number; colId: string };
    end: { rowId: number; colId: string };
  } | null;
}

export default function TableGrid({
  rows,
  attributes,
  rowStartIndex,
  onAttrChange,
  onDeleteAttribute,
  onResultChange,
  onEvidenceChange,
  evidenceOptions,
  onWeekChange,
  onCommentChange,
  onAddAttribute,
  onUpdateAttribute,
  columnHeaders,
  onUpdateColumnHeader,
  onEditClick,
  onDeleteRow,
  maxHeight,
  columnWidths,
  onAddRow,
  onColumnResize,

  selectedRowIds,
  onToggleRowSelection,
  onToggleAllSelection,
  selectionMode,
  activeRowId,
  activeColumnId,
  onCellMouseDown,
  onCellMouseEnter,
  isCellSelected,
  selectionRange,
}: TableGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevRowsLength = useRef(rows.length);
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);
  const [openEvidenceRowId, setOpenEvidenceRowId] = useState<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    const startX = e.pageX;
    const headerElement = (e.target as HTMLElement).closest("th");
    if (!headerElement) return;

    const startWidth = headerElement.getBoundingClientRect().width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.pageX - startX;
      const newWidth = Math.max(50, startWidth + deltaX);
      if (onColumnResize) {
        onColumnResize(columnId, newWidth);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.classList.remove("select-none");
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.classList.add("select-none");
  };

  useEffect(() => {
    if (rows.length > prevRowsLength.current) {
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 50);
    }
    prevRowsLength.current = rows.length;
  }, [rows.length]);

  useEffect(() => {
    if (openEvidenceRowId === null) return;
    const stillExists = rows.some((row) => row.id === openEvidenceRowId);
    if (!stillExists) {
      setOpenEvidenceRowId(null);
    }
  }, [rows, openEvidenceRowId]);

  // background for Attr
  const getResultSelectClass = (value: "Pass" | "Fail" | "") => {
    const baseClass =
      "w-full h-10 text-xs font-semibold px-3 transition-colors cursor-pointer appearance-none outline-hidden focus:outline-hidden border-0 focus:border-0 ring-0 focus:ring-0 shadow-none";
    if (value === "Pass") {
      return `${baseClass} bg-emerald-50 text-emerald-800 focus:bg-emerald-50 focus:ring-0`;
    }
    if (value === "Fail") {
      return `${baseClass} bg-red-50 text-red-800 focus:bg-red-50 focus:ring-0`;
    }
    return `${baseClass} bg-gray-50 text-gray-500 focus:bg-gray-50 focus:ring-0`;
  };

  const formatWidth = (w?: string | number) => {
    if (w === undefined) return undefined;
    return typeof w === "number" ? `${w}px` : w;
  };

  const selStartRowIdx = selectionRange ? rows.findIndex((r) => r.id === selectionRange.start.rowId) : -1;
  const selEndRowIdx = selectionRange ? rows.findIndex((r) => r.id === selectionRange.end.rowId) : -1;
  const minRow = selectionRange ? Math.min(selStartRowIdx, selEndRowIdx) : -1;
  const maxRow = selectionRange ? Math.max(selStartRowIdx, selEndRowIdx) : -1;

  return (
    <div className="w-full flex flex-col">
      {selectionMode && (
        <div className="bg-blue-50/50 border-b border-blue-200 px-6 py-2.5 text-xs text-blue-700 flex items-center gap-2 select-none">
          <span className="font-semibold">Selection Mode Active:</span>
          <span>
            Check the rows you wish to copy, then click &quot;Copy
            Selection&quot; on the toolbar.
          </span>
        </div>
      )}

      <div
        ref={containerRef}
        className="overflow-y-auto overflow-x-auto w-full outline-none"
        style={{ maxHeight: formatWidth(maxHeight) }}>
        <div className="min-w-full w-max pr-3">
          <table
            className="min-w-full text-left border-collapse"
            style={{ width: "max-content" }}>
            <thead>
              <tr>
                <th
                  style={{
                    width: formatWidth(columnWidths?.order),
                    minWidth: formatWidth(columnWidths?.order),
                  }}
                  className="sticky top-0 z-10 bg-gray-50 border-b border-r border-gray-200 align-middle resize-">
                  <div className="flex items-center gap-1.5 justify-center">
                    <button
                      type="button"
                      className="w-4 h-4 p-0 flex items-center justify-center cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddRow();
                        setTimeout(() => {
                          if (containerRef.current) {
                            containerRef.current.scrollTo({
                              top: containerRef.current.scrollHeight,
                              behavior: "smooth",
                            });
                          }
                        }, 50);
                      }}
                    >
                      <AddIcon sx={{ fontSize: 16 }} className="text-[#C00000] hover:text-green-800" />
                    </button>
                    <input
                      type="checkbox"
                      checked={
                        rows.length > 0 && selectedRowIds.size === rows.length
                      }
                      onChange={onToggleAllSelection}
                      className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer shrink-0"
                      style={{ width: 14, height: 14, flex: '0 0 auto', display: 'block' }}
                      title="Select/Deselect All Rows"
                    />
                  </div>
                  <div
                    onMouseDown={(e) => handleMouseDown(e, "order")}
                    className="absolute right-0 top-0 bottom-0 w-2  cursor-col-resize z-20 select-none transition-colors duration-150 flex items-center justify-center group/resize"
                    style={{ touchAction: "none" }}></div>
                </th>
                {/* Sample Week */}
                <th
                  style={{
                    width: formatWidth(columnWidths?.week),
                    minWidth: formatWidth(columnWidths?.week),
                  }}
                  onMouseEnter={() => setHoveredCol("week")}
                  onMouseLeave={() => setHoveredCol(null)}
                  className="group sticky top-0 z-10 bg-gray-50 border-b border-r border-gray-200 px-4 py-3 text-xs font-bold text-gray-700 normal-case tracking-wider align-middle">
                  <div className="relative flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5 flex-1 ">
                      <input
                        type="text"
                        value={columnHeaders.week}
                        onChange={(e) =>
                          onUpdateColumnHeader("week", e.target.value)
                        }
                        className="text-xs font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:bg-white focus:ring-1  outline-hidden rounded px-1 py-0.5 w-full normal-case tracking-wider"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onAddAttribute(0)}
                      onMouseEnter={() => setHoveredCol("week")}
                      onMouseLeave={() => setHoveredCol(null)}
                      style={{
                        opacity: hoveredCol === "week" ? 1 : 0,
                        transition: "opacity 150ms ease-in-out",
                      }}
                      className="z-30 absolute -right-3 top-1/2 -translate-y-1/2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 w-5 h-5 rounded-full cursor-pointer flex items-center justify-center border border-emerald-250 bg-white shadow-xs"
                      title="Add Attribute Column">
                      <AddIcon sx={{ fontSize: 12 }} />
                    </button>
                  </div>
                  <div
                    onMouseDown={(e) => handleMouseDown(e, "week")}
                    className="absolute right-0 top-0 bottom-0 w-2  cursor-col-resize z-20 select-none transition-colors duration-150 flex items-center justify-center group/resize"
                    style={{ touchAction: "none" }}></div>
                </th>
                {/* Dynamic Attributes */}
                {attributes.map((attr, idx) => (
                  <th
                    key={attr.id}
                    style={{
                      width: formatWidth(
                        columnWidths?.[attr.id] ?? columnWidths?.attributes,
                      ),
                      minWidth: formatWidth(
                        columnWidths?.[attr.id] ?? columnWidths?.attributes,
                      ),
                    }}
                    onMouseEnter={() => setHoveredCol(attr.id)}
                    onMouseLeave={() => setHoveredCol(null)}
                    className="group sticky top-0 z-10 bg-gray-50 border-b border-r border-gray-200 px-4 py-3 text-xs font-bold text-gray-700 normal-case tracking-wider align-middle">
                    <div className="relative flex flex-col w-full">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => onDeleteAttribute(attr.id)}
                            className="text-[#C00000] hover:text-[#900000] cursor-pointer flex items-center justify-center shrink-0"
                            title={`Delete ${attr.name}`}>
                            <DeleteIcon sx={{ fontSize: 14 }} />
                          </button>
                          <span className="text-xs font-bold text-gray-800 px-1 py-0.5 normal-case select-none truncate">
                            {attr.name}
                          </span>
                        </div>
                      </div>
                      <textarea
                        value={attr.description || attr.columnName || ""}
                        onChange={(e) =>
                          onUpdateAttribute(attr.id, {
                            description: e.target.value,
                            columnName: e.target.value,
                          })
                        }
                        aria-label={`Edit ${attr.name} description`}
                        placeholder="Enter description..."
                        rows={3}
                        className="text-[11px] text-gray-500 font-normal normal-case bg-transparent border border-transparent hover:border-gray-300 focus:border-gray-400 focus:bg-white outline-hidden rounded px-1.5 py-1 w-full mt-1.5 leading-snug resize-none overflow-y-auto"
                      />

                      <button
                        type="button"
                        onClick={() => onAddAttribute(idx + 1)}
                        onMouseEnter={() => setHoveredCol(attr.id)}
                        onMouseLeave={() => setHoveredCol(null)}
                        style={{
                          opacity: hoveredCol === attr.id ? 1 : 0,
                          transition: "opacity 150ms ease-in-out",
                        }}
                        className="z-30 absolute -right-3 top-1/2 -translate-y-1/2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 w-5 h-5 rounded-full cursor-pointer flex items-center justify-center border border-emerald-250 bg-white shadow-xs"
                        title="Add Attribute Column">
                        <AddIcon sx={{ fontSize: 12 }} />
                      </button>
                    </div>
                    <div
                      onMouseDown={(e) => handleMouseDown(e, attr.id)}
                      className="absolute right-0 top-0 bottom-0 w-2  cursor-col-resize z-20 select-none transition-colors duration-150 flex items-center justify-center group/resize"
                      style={{ touchAction: "none" }}></div>
                  </th>
                ))}

                {/* Supporting Evidence */}
                <th
                  style={{
                    width: formatWidth(columnWidths?.evidence),
                    minWidth: formatWidth(columnWidths?.evidence),
                  }}
                  className="sticky top-0 z-10 bg-gray-50 border-b border-r border-gray-200 px-4 py-3 text-xs font-bold text-gray-700 normal-case tracking-wider align-middle">
                  <div className="px-1 py-0.5 text-gray-800 leading-normal select-none">
                    Supporting Evidence per Attribute
                  </div>
                  <div
                    onMouseDown={(e) => handleMouseDown(e, "evidence")}
                    className="absolute right-0 top-0 bottom-0 w-2  cursor-col-resize z-20 select-none transition-colors duration-150 flex items-center justify-center group/resize"
                    style={{ touchAction: "none" }}></div>
                </th>

                {/* Assessment Result */}
                <th
                  style={{
                    width: formatWidth(columnWidths?.result),
                    minWidth: formatWidth(columnWidths?.result),
                  }}
                  className="sticky top-0 z-10 bg-gray-50 border-b border-r border-gray-200 px-4 py-3 text-xs font-bold text-gray-700 normal-case tracking-wider align-middle">
                  <div className="px-1 py-0.5 text-gray-800 leading-normal select-none">
                    Control Sample Assessment Result (Pass/Fail)
                  </div>
                  <div
                    onMouseDown={(e) => handleMouseDown(e, "result")}
                    className=" touch-none absolute right-0 top-0 bottom-0 w-2  cursor-col-resize z-20 select-none transition-colors duration-150 flex items-center justify-center group/resize"></div>
                </th>

                {/* Comment */}
                <th
                  style={{
                    width: formatWidth(columnWidths?.comment),
                    minWidth: formatWidth(columnWidths?.comment),
                  }}
                  className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-4 py-3 text-xs font-bold text-gray-700 normal-case tracking-wider align-middle">
                  <div className="px-1 py-0.5 text-gray-800 leading-normal select-none">
                    {columnHeaders.comment}
                  </div>
                  <div
                    onMouseDown={(e) => handleMouseDown(e, "comment")}
                    className=" touch-none absolute right-0 top-0 bottom-0 w-2  cursor-col-resize z-20 select-none transition-colors duration-150 flex items-center justify-center group/resize"></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isMultiCellRange = !!selectionRange && (selectionRange.start.rowId !== selectionRange.end.rowId || selectionRange.start.colId !== selectionRange.end.colId);
                const isActive = activeRowId === row.id && !isMultiCellRange;
                const isSelected = selectedRowIds.has(row.id);
                const isRowInSelection = selectionRange && idx >= minRow && idx <= maxRow;
                const getCellClass = (colId: string, hasBorderRight = true) => {
                  const isActiveCell =
                    activeRowId === row.id && activeColumnId === colId;

                  const isRangeSelected = isCellSelected(row.id, colId);

                  let cellClass = "";
                  if (isActiveCell) {
                    cellClass = "ring-2! ring-blue-600! ring-inset! z-20! bg-blue-50/70!";
                  } else if (isRangeSelected) {
                    cellClass = "ring-1! ring-blue-300/60! ring-inset! z-10! bg-blue-500/20!";
                  }

                  return `${hasBorderRight ? "border-r border-gray-200" : ""} p-0 select-none transition relative focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-inset focus-within:z-10 ${cellClass}`;
                };

                return (
                  <tr
                    key={row.id}
                    className={`group border-b border-gray-200 last:border-0 transition-colors cursor-pointer ${isActive ? "bg-blue-50/70"
                      : isSelected ? "bg-blue-100/30"
                        : "hover:bg-gray-100/20"
                      }`}>
                    {/* Row Number & Checkbox (Col 0) */}
                    <td
                      onMouseDown={(e) => onCellMouseDown(e, row.id, "order")}
                      onMouseEnter={() => onCellMouseEnter(row.id, "order")}
                      className={`border-r border-gray-100 p-0 select-none transition relative ${isCellSelected(row.id, "order") ?
                        (activeRowId === row.id && activeColumnId === "order" ? "ring-2! ring-blue-600! ring-inset! z-20! bg-blue-50/70!" : "ring-1! ring-blue-300/60! ring-inset! z-10! bg-blue-500/20!")
                        : (isRowInSelection ? "bg-blue-500/5!" : "")
                        }`}>
                      <div className="h-10 flex items-center gap-1.5 text-xs font-semibold text-gray-500 justify-center px-1">
                        <input
                          type="checkbox"
                          checked={selectedRowIds.has(row.id)}
                          onChange={() => onToggleRowSelection(row.id)}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                          style={{ width: 12, height: 12, flex: '0 0 auto', display: 'block' }}
                        />
                        <span className="min-w-3 text-center text-gray-800 font-bold">
                          {rowStartIndex + idx + 1}
                        </span>
                      </div>
                    </td>

                    {/* Week (Col 1) */}
                    <td
                      onMouseDown={(e) => onCellMouseDown(e, row.id, "week")}
                      onMouseEnter={() => onCellMouseEnter(row.id, "week")}
                      className={getCellClass("week")}>
                      {selectionMode ?
                        <div className="w-full h-10 text-xs font-medium text-gray-700 flex items-center justify-center">
                          {row.week}
                        </div>
                        : <div className="flex items-center h-10 px-2 gap-1.5 text-gray-400 w-full">
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Edit pencil icon */}
                            <button
                              type="button"
                              className="w-4 h-4 p-0 flex items-center justify-center cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditClick(row);
                              }}
                            >
                              <EditIcon sx={{ fontSize: 14, color: "red" }} />
                            </button>
                            {/* Trash icon */}
                            <button
                              type="button"
                              className="w-4 h-4 p-0 flex items-center justify-center cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteRow(row.id);
                              }}
                            >
                              <DeleteIcon sx={{ fontSize: 14, color: "red" }} />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={row.week}
                            onChange={(e) =>
                              onWeekChange(row.id, e.target.value)
                            }
                            className="w-full h-full text-xs font-medium text-gray-700 bg-transparent border-0 px-1 focus:ring-0 outline-hidden"
                          />
                        </div>
                      }
                    </td>

                    {/* Dynamic Attributes (Col 2 ..N+1) */}
                    {attributes.map((attr) => {
                      const val = row.attributes[attr.id] || "";
                      return (
                        <td
                          key={attr.id}
                          onMouseDown={(e) => onCellMouseDown(e, row.id, attr.id)}
                          onMouseEnter={() => onCellMouseEnter(row.id, attr.id)}
                          className={getCellClass(attr.id)}>
                          {selectionMode ?
                            <div className="w-full h-10 text-xs font-medium text-gray-700 px-3 flex items-center">
                              {val}
                            </div>
                            : <input
                              type="text"
                              value={val}
                              onChange={(e) =>
                                onAttrChange(row.id, attr.id, e.target.value)
                              }
                              className="w-full h-10 text-xs font-medium text-gray-700 bg-transparent border-0 px-3 focus:ring-0 outline-hidden"
                            />
                          }
                        </td>
                      );
                    })}

                    {/* Supporting Evidence (Col N+2) */}
                    <td
                      onMouseDown={(e) => onCellMouseDown(e, row.id, "evidence")}
                      onMouseEnter={() => onCellMouseEnter(row.id, "evidence")}
                      style={{
                        width: formatWidth(columnWidths?.evidence),
                        minWidth: formatWidth(columnWidths?.evidence),
                        maxWidth: formatWidth(columnWidths?.evidence),
                      }}
                      className={getCellClass("evidence")}>
                      {selectionMode ?
                        <div className="w-full h-10 text-xs font-semibold text-gray-700 px-3 flex items-center">
                          {row.evidence}
                        </div>
                        : <div className="w-full h-10 px-1 min-w-0">
                          <EvidenceMultiSelect
                            value={row.evidence}
                            options={mergeEvidenceOptions(row.evidence, evidenceOptions)}
                            onChange={(nextValue) => onEvidenceChange(row.id, nextValue)}
                            open={openEvidenceRowId === row.id}
                            onOpenChange={(nextOpen) => {
                              setOpenEvidenceRowId((prev) =>
                                nextOpen ? row.id : prev === row.id ? null : prev,
                              );
                            }}
                            compact
                            label=""
                          />
                        </div>
                      }
                    </td>

                    {/* Assessment Result (Col N+3) */}
                    <td
                      onMouseDown={(e) => onCellMouseDown(e, row.id, "result")}
                      onMouseEnter={() => onCellMouseEnter(row.id, "result")}
                      className={`${getCellClass("result")} focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-inset`}>
                      {selectionMode ?
                        <div
                          className={
                            getResultSelectClass(row.result) +
                            " flex items-center"
                          }>
                          {row.result}
                        </div>
                        : <select
                          value={row.result}
                          onChange={(e) =>
                            onResultChange(
                              row.id,
                              e.target.value as "Pass" | "Fail" | "",
                            )
                          }
                          className={`${getResultSelectClass(row.result)} ${isCellSelected(row.id, "result") || (activeRowId === row.id && activeColumnId === "result") ? "bg-transparent!" : ""
                            }`}>
                          {row.result === "" && <option value=""> </option>}
                          <option value="Pass">Pass</option>
                          <option value="Fail">Fail</option>
                        </select>
                      }
                    </td>

                    {/* Comment (Col N+4) */}
                    <td
                      onMouseDown={(e) => onCellMouseDown(e, row.id, "comment")}
                      onMouseEnter={() => onCellMouseEnter(row.id, "comment")}
                      className={getCellClass("comment", false)}>
                      {selectionMode ?
                        <div className="w-full h-10 text-xs font-medium text-gray-700 px-3 flex items-center">
                          {row.comment || ""}
                        </div>
                        : <input
                          type="text"
                          value={row.comment || ""}
                          onChange={(e) =>
                            onCommentChange(row.id, e.target.value)
                          }
                          className="w-full h-10 text-xs font-medium text-gray-700 bg-transparent border-0 px-3 focus:ring-0 outline-hidden"
                        />
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
