import copy from "copy-to-clipboard";
import { SampleRow, Attribute } from "../mockData";

export interface SelectionRange {
  start: { rowId: number; colId: string };
  end: { rowId: number; colId: string };
}

// Writes raw text to clipboard using the copy-to-clipboard library.
export function writeToClipboard(text: string): boolean {
  try {
    return copy(text, {
      format: "text/plain",
    });
  } catch (err) {
    console.error("Failed to copy to clipboard", err);
    return false;
  }
}

// Serializes selected rows (or active row if no selection) into a TSV string.
export function exportSelectionToTSV(
  rows: SampleRow[],
  attributes: Attribute[],
  selectedRowIds: Set<number>,
  activeRowId: number | null
): { tsvContent: string; copiedCount: number } {
  let tsvContent = "";
  let copiedCount = 0;

  if (selectedRowIds.size > 0) {
    rows.forEach((row, idx) => {
      if (selectedRowIds.has(row.id)) {
        const rowCells = [
          (idx + 1).toString(),
          row.week,
          ...attributes.map((a) => row.attributes[a.id] || ""),
          row.evidence,
          row.result,
          row.comment || "", // <-- Thêm comment
        ];
        tsvContent += rowCells.join("\t") + "\n";
        copiedCount++;
      }
    });
  } else if (typeof activeRowId === "number") {
    const activeIdx = rows.findIndex((r) => r.id === activeRowId);
    if (activeIdx !== -1) {
      const row = rows[activeIdx];
      const rowCells = [
        (activeIdx + 1).toString(),
        row.week,
        ...attributes.map((a) => row.attributes[a.id] || ""),
        row.evidence,
        row.result,
        row.comment || "", // <-- Thêm comment
      ];
      tsvContent += rowCells.join("\t") + "\n";
      copiedCount = 1;
    }
  }

  return { tsvContent, copiedCount };
}

// Serializes the entire table (including headers) into a TSV string.
export function exportAllToTSV(
  rows: SampleRow[],
  attributes: Attribute[],
  columnHeaders: { week: string; evidence: string; result: string; comment: string } // <-- Thêm comment
): string {
  let tsvContent = "";

  const headers = [
    "Order",
    columnHeaders.week,
    ...attributes.map((a) => a.name),
    columnHeaders.evidence,
    columnHeaders.result,
    columnHeaders.comment, // <-- Thêm comment
  ];
  tsvContent += headers.join("\t") + "\n";

  rows.forEach((row, idx) => {
    const rowCells = [
      (idx + 1).toString(),
      row.week,
      ...attributes.map((a) => row.attributes[a.id] || ""),
      row.evidence,
      row.result,
      row.comment || "", // <-- Thêm comment
    ];
    tsvContent += rowCells.join("\t") + "\n";
  });

  return tsvContent;
}

// Serializes a selected cell range into a TSV string.
export function exportCellRangeToTSV(
  rows: SampleRow[],
  attributes: Attribute[],
  selectionRange: SelectionRange
): { tsvContent: string; rowCount: number; colCount: number } | null {
  const { start, end } = selectionRange;

  const startRowIdx = rows.findIndex((r) => r.id === start.rowId);
  const endRowIdx = rows.findIndex((r) => r.id === end.rowId);
  const minRow = Math.min(startRowIdx, endRowIdx);
  const maxRow = Math.max(startRowIdx, endRowIdx);

  // <-- Thêm "comment" vào mảng allColumns
  const allColumns = ["order", "week", ...attributes.map((a) => a.id), "evidence", "result", "comment"];
  const startColIdx = allColumns.indexOf(start.colId);
  const endColIdx = allColumns.indexOf(end.colId);
  const minCol = Math.min(startColIdx, endColIdx);
  const maxCol = Math.max(startColIdx, endColIdx);

  if (startRowIdx === -1 || endRowIdx === -1 || minCol === -1 || maxCol === -1) {
    return null;
  }

  let tsvContent = "";
  const rowCount = maxRow - minRow + 1;
  const colCount = maxCol - minCol + 1;

  if (minRow === maxRow && minCol === maxCol) {
    const row = rows[minRow];
    const colId = allColumns[minCol];
    if (colId === "order") {
      tsvContent = (minRow + 1).toString();
    } else if (colId === "week") {
      tsvContent = row.week;
    } else if (colId === "evidence") {
      tsvContent = row.evidence;
    } else if (colId === "result") {
      tsvContent = row.result;
    } else if (colId === "comment") { // <-- Thêm logic lấy dữ liệu comment
      tsvContent = row.comment || "";
    } else {
      tsvContent = row.attributes[colId] || "";
    }
  } else {
    for (let r = minRow; r <= maxRow; r++) {
      const row = rows[r];
      const rowCells: string[] = [];
      for (let c = minCol; c <= maxCol; c++) {
        const colId = allColumns[c];
        if (colId === "order") {
          rowCells.push((r + 1).toString());
        } else if (colId === "week") {
          rowCells.push(row.week);
        } else if (colId === "evidence") {
          rowCells.push(row.evidence);
        } else if (colId === "result") {
          rowCells.push(row.result);
        } else if (colId === "comment") { // <-- Thêm logic lấy dữ liệu comment
          rowCells.push(row.comment || "");
        } else {
          rowCells.push(row.attributes[colId] || "");
        }
      }
      tsvContent += rowCells.join("\t") + "\n";
    }
  }

  return { tsvContent, rowCount, colCount };
}