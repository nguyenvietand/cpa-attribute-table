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

/**
 * Escapes a cell value according to TSV / RFC 4180 rules:
 * - If the value contains newline (\n or \r), tab (\t), or double quote ("),
 *   internal double quotes are doubled (" -> "") and the entire value is enclosed in double quotes.
 * - This prevents Excel from splitting multiline cell content into multiple rows or columns.
 */
export function escapeTSVCell(val: string | undefined | null): string {
  if (val === undefined || val === null) return "";
  const str = String(val);
  if (str.includes('"') || str.includes("\t") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
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
          escapeTSVCell(row.week),
          ...attributes.map((a) => escapeTSVCell(row.attributes[a.id] || "")),
          escapeTSVCell(row.evidence),
          escapeTSVCell(row.result),
          escapeTSVCell(row.comment || ""),
        ];
        tsvContent += rowCells.join("\t") + "\r\n";
        copiedCount++;
      }
    });
  } else if (typeof activeRowId === "number") {
    const activeIdx = rows.findIndex((r) => r.id === activeRowId);
    if (activeIdx !== -1) {
      const row = rows[activeIdx];
      const rowCells = [
        (activeIdx + 1).toString(),
        escapeTSVCell(row.week),
        ...attributes.map((a) => escapeTSVCell(row.attributes[a.id] || "")),
        escapeTSVCell(row.evidence),
        escapeTSVCell(row.result),
        escapeTSVCell(row.comment || ""),
      ];
      tsvContent += rowCells.join("\t") + "\r\n";
      copiedCount = 1;
    }
  }

  return { tsvContent, copiedCount };
}

// Serializes the entire table (including headers) into a TSV string.
export function exportAllToTSV(
  rows: SampleRow[],
  attributes: Attribute[],
  columnHeaders: { week: string; evidence: string; result: string; comment: string }
): string {
  let tsvContent = "";

  const headers = [
    "Order",
    escapeTSVCell(columnHeaders.week),
    ...attributes.map((a) => escapeTSVCell(a.name)),
    escapeTSVCell(columnHeaders.evidence),
    escapeTSVCell(columnHeaders.result),
    escapeTSVCell(columnHeaders.comment),
  ];
  tsvContent += headers.join("\t") + "\r\n";

  rows.forEach((row, idx) => {
    const rowCells = [
      (idx + 1).toString(),
      escapeTSVCell(row.week),
      ...attributes.map((a) => escapeTSVCell(row.attributes[a.id] || "")),
      escapeTSVCell(row.evidence),
      escapeTSVCell(row.result),
      escapeTSVCell(row.comment || ""),
    ];
    tsvContent += rowCells.join("\t") + "\r\n";
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

  const getCellRawValue = (rIdx: number, cId: string): string => {
    const row = rows[rIdx];
    if (cId === "order") return (rIdx + 1).toString();
    if (cId === "week") return row.week || "";
    if (cId === "evidence") return row.evidence || "";
    if (cId === "result") return row.result || "";
    if (cId === "comment") return row.comment || "";
    return row.attributes[cId] || "";
  };

  if (minRow === maxRow && minCol === maxCol) {
    const colId = allColumns[minCol];
    const rawVal = getCellRawValue(minRow, colId);
    tsvContent = escapeTSVCell(rawVal);
  } else {
    for (let r = minRow; r <= maxRow; r++) {
      const rowCells: string[] = [];
      for (let c = minCol; c <= maxCol; c++) {
        const colId = allColumns[c];
        const rawVal = getCellRawValue(r, colId);
        rowCells.push(escapeTSVCell(rawVal));
      }
      tsvContent += rowCells.join("\t") + "\r\n";
    }
  }

  return { tsvContent, rowCount, colCount };
}