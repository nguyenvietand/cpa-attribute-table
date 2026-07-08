import { SampleRow, Attribute } from "../mockData";

export interface SelectionRange {
  start: { rowId: number; colId: string };
  end: { rowId: number; colId: string };
}

export interface PasteResult {
  updatedRows?: SampleRow[];
  newRowsToImport?: Omit<SampleRow, "id">[];
  overrideStartRowId?: number;
  message?: string;
  severity?: "success" | "error" | "warning";
}

/**
 * Parses and processes TSV data pasted from the clipboard (e.g. Excel).
 */
export function processPaste(
  text: string,
  rows: SampleRow[],
  attributes: Attribute[],
  selectionRange: SelectionRange | null,
  activeRowId: number | null,
  activeColumnId: string | null
): PasteResult {
  if (!text) return {};

  // Split clipboard data into lines and cells (TSV format from Excel)
  const lines = text.split(/\r?\n/);
  const grid: string[][] = lines
    .map((line) => line.split("\t").map((cell) => cell.trim()));

  // Trim empty lines from the end of the grid:
  while (
    grid.length > 0 &&
    (grid[grid.length - 1].length === 0 ||
      (grid[grid.length - 1].length === 1 && grid[grid.length - 1][0] === ""))
  ) {
    grid.pop();
  }

  if (grid.length === 0) return {};

  const columnOrder = ["week", ...attributes.map((a) => a.id), "evidence", "result"];
  const startRowIdx = selectionRange
    ? Math.min(rows.findIndex((r) => r.id === selectionRange.start.rowId), rows.findIndex((r) => r.id === selectionRange.end.rowId))
    : (activeRowId !== null ? rows.findIndex((r) => r.id === activeRowId) : -1);

  // If we clicked on the order column (activeColumnId is "order" or null), we shift the paste starting column to "week"
  const targetColId =
    activeRowId !== null && (activeColumnId === null || activeColumnId === "order") ?
      "week"
    : activeColumnId;

  let startColIdx = -1;
  if (selectionRange) {
    const selStartColId = selectionRange.start.colId === "order" || selectionRange.end.colId === "order" ? "week" : selectionRange.start.colId;
    const selEndColId = selectionRange.start.colId === "order" || selectionRange.end.colId === "order" ? "week" : selectionRange.end.colId;
    startColIdx = Math.min(columnOrder.indexOf(selStartColId), columnOrder.indexOf(selEndColId));
  } else if (targetColId !== null) {
    startColIdx = columnOrder.indexOf(targetColId);
  }

  // Handle the case where the user clicks the "order" column and pastes a row containing the order/row index column.
  let adjustedGrid = grid;
  if (activeColumnId === "order" && grid.length > 0 && grid[0].length > 1) {
    const firstCell = grid[0][0].toLowerCase();
    const isFirstCellOrder = /^\d+$/.test(firstCell) || firstCell === "order" || firstCell === "id";
    if (isFirstCellOrder) {
      adjustedGrid = grid.map((row) => row.slice(1));
    }
  }

  // If a multi-cell selection range is active, verify that pasted data dimensions do not exceed the selected range
  const isMultiCellRange = selectionRange && (selectionRange.start.rowId !== selectionRange.end.rowId || selectionRange.start.colId !== selectionRange.end.colId);
  if (isMultiCellRange) {
    const selStartRowIdx = rows.findIndex((r) => r.id === selectionRange.start.rowId);
    const selEndRowIdx = rows.findIndex((r) => r.id === selectionRange.end.rowId);
    const targetH = Math.abs(selStartRowIdx - selEndRowIdx) + 1;

    const allColumns = ["order", "week", ...attributes.map((a) => a.id), "evidence", "result"];
    const selStartColIdx = allColumns.indexOf(selectionRange.start.colId);
    const selEndColIdx = allColumns.indexOf(selectionRange.end.colId);
    const targetW = Math.abs(selStartColIdx - selEndColIdx) + 1;

    const pastedRows = adjustedGrid.length;
    const pastedCols = Math.max(...adjustedGrid.map((r) => r.length));

    if (pastedRows > targetH || pastedCols > targetW) {
      return {
        message: "Cannot copy due to exceed copy range",
        severity: "error",
      };
    }
  }

  // Flexible cell-level paste (if an active cell is selected)
  if (startRowIdx !== -1 && startColIdx !== -1) {
    const pastedRows = adjustedGrid.length;
    const pastedCols = Math.max(...adjustedGrid.map((r) => r.length));
    const remainingRows = rows.length - startRowIdx;
    const remainingCols = columnOrder.length - startColIdx;

    if (pastedRows > remainingRows || pastedCols > remainingCols) {
      return {
        message: "Cannot copy due to exceed copy range",
        severity: "error",
      };
    }

    const isMultiCell = adjustedGrid.length > 1 || adjustedGrid.some((row) => row.length > 1);

    if (!isMultiCell) {
      // Single cell paste
      const targetVal = adjustedGrid[0][0];
      const targetColId = columnOrder[startColIdx];
      const updatedRows = rows.map((row, idx) => {
        if (idx !== startRowIdx) return row;
        if (targetColId === "week") {
          return { ...row, week: targetVal };
        } else if (targetColId === "evidence") {
          let cleanVal = targetVal;
          if (/^[a-zA-Z]$/.test(targetVal)) {
            cleanVal = targetVal.toUpperCase();
          }
          return { ...row, evidence: cleanVal };
        } else if (targetColId === "result") {
          let cleanVal: "Pass" | "Fail" | "" = "Pass";
          if (/^fail$/i.test(targetVal)) {
            cleanVal = "Fail";
          } else if (targetVal === "") {
            cleanVal = "";
          }
          return { ...row, result: cleanVal };
        } else {
          // dynamic attribute column
          let cleanVal = targetVal;
          if (/^pass$/i.test(cleanVal)) {
            cleanVal = "Pass";
          } else if (/^fail$/i.test(cleanVal)) {
            cleanVal = "Fail";
          }
          return {
            ...row,
            attributes: {
              ...row.attributes,
              [targetColId]: cleanVal,
            },
          };
        }
      });
      return {
        updatedRows,
        message: "Successfully pasted value to the selected cell!",
        severity: "success",
      };
    } else {
      // Excel table/multi-cell paste starting from the clicked cell downwards and rightwards
      const updatedRows = [...rows];
      adjustedGrid.forEach((gridRow, r) => {
        const targetRowIdx = startRowIdx + r;

        if (targetRowIdx >= updatedRows.length) {
          return;
        }

        const rowToUpdate = { ...updatedRows[targetRowIdx] };
        rowToUpdate.attributes = { ...rowToUpdate.attributes };

        gridRow.forEach((cellVal, c) => {
          const targetColIdx = startColIdx + c;
          if (targetColIdx < columnOrder.length) {
            const colId = columnOrder[targetColIdx];
            if (colId === "week") {
              rowToUpdate.week = cellVal;
            } else if (colId === "evidence") {
              let cleanVal = cellVal;
              if (/^[a-zA-Z]$/.test(cellVal)) {
                cleanVal = cellVal.toUpperCase();
              }
              rowToUpdate.evidence = cleanVal;
            } else if (colId === "result") {
              let cleanVal: "Pass" | "Fail" | "" = "Pass";
              if (/^fail$/i.test(cellVal)) {
                cleanVal = "Fail";
              } else if (cellVal === "") {
                cleanVal = "";
              }
              rowToUpdate.result = cleanVal;
            } else {
              // Dynamic attribute
              let cleanVal = cellVal;
              if (/^pass$/i.test(cellVal)) {
                cleanVal = "Pass";
              } else if (/^fail$/i.test(cellVal)) {
                cleanVal = "Fail";
              }
              rowToUpdate.attributes[colId] = cleanVal;
            }
          }
        });

        updatedRows[targetRowIdx] = rowToUpdate;
      });

      return {
        updatedRows,
        message: `Successfully pasted and overrode cell range starting from selected cell!`,
        severity: "success",
      };
    }
  }

  const filteredGrid = grid.filter((row) => row.length > 0 && row.some((cell) => cell !== ""));
  if (filteredGrid.length === 0) return {};

  // detect if the first row is a header row by checking keywords
  let dataStartIndex = 0;
  const firstRow = filteredGrid[0];
  const looksLikeHeader = firstRow.some((cell) => {
    const lower = cell.toLowerCase();
    return (
      lower.includes("week") ||
      lower.includes("order") ||
      lower.includes("evidence") ||
      lower.includes("result") ||
      lower.includes("attribute")
    );
  });

  if (looksLikeHeader) {
    dataStartIndex = 1;
  }

  type ColumnMapping =
    | { type: "order" }
    | { type: "week" }
    | { type: "attribute"; attributeId: string }
    | { type: "evidence" }
    | { type: "result" }
    | { type: "unknown" };

  const headerMappings: ColumnMapping[] = [];

  if (looksLikeHeader) {
    firstRow.forEach((cell) => {
      const lower = cell.toLowerCase();
      if (lower.includes("order") || lower === "id") {
        headerMappings.push({ type: "order" });
      } else if (lower.includes("week") || lower.includes("date") || lower.includes("sample w")) {
        headerMappings.push({ type: "week" });
      } else if (lower.includes("evidence") || lower.includes("support")) {
        headerMappings.push({ type: "evidence" });
      } else if (lower.includes("result") || lower.includes("assess") || lower.includes("pass/fail")) {
        headerMappings.push({ type: "result" });
      } else {
        const matchedAttr = attributes.find((attr) => {
          const attrNameLower = attr.name.toLowerCase();
          return (
            lower === attrNameLower ||
            lower.includes(attrNameLower) ||
            lower.replace(/\s+/g, "").includes(attrNameLower.replace(/\s+/g, ""))
          );
        });

        if (matchedAttr) {
          headerMappings.push({ type: "attribute", attributeId: matchedAttr.id });
        } else {
          const match = lower.match(/attr(ibute)?\s*(\d+)/i);
          if (match) {
            const num = match[2];
            const matchedAttrByNum = attributes.find((attr) =>
              attr.name.toLowerCase().includes(`attribute ${num}`) ||
              attr.name.toLowerCase().includes(`attr ${num}`)
            );
            if (matchedAttrByNum) {
              headerMappings.push({ type: "attribute", attributeId: matchedAttrByNum.id });
              return;
            }
          }
          headerMappings.push({ type: "unknown" });
        }
      }
    });
  }

  const newRowsData: Omit<SampleRow, "id">[] = [];

  for (let i = dataStartIndex; i < filteredGrid.length; i++) {
    const cells = filteredGrid[i];

    if (cells.length < 3) {
      continue;
    }

    let rowMappings = headerMappings;

    if (!looksLikeHeader) {
      let hasIdColumn = false;
      if (cells.length >= 5 && /^\d+$/.test(cells[0])) {
        const secondCellLower = cells[1].toLowerCase();
        const isSecondCellAttribute =
          secondCellLower === "pass" ||
          secondCellLower === "fail" ||
          secondCellLower === "n/a" ||
          secondCellLower === "";
        if (!isSecondCellAttribute) {
          hasIdColumn = true;
        }
      }

      const colOffset = hasIdColumn ? 1 : 0;
      rowMappings = [];
      if (hasIdColumn) {
        rowMappings.push({ type: "order" });
      }
      rowMappings.push({ type: "week" });

      const pastedAttrCount = cells.length - (colOffset + 1 + 2);
      for (let idx = 0; idx < pastedAttrCount; idx++) {
        if (idx < attributes.length) {
          rowMappings.push({ type: "attribute", attributeId: attributes[idx].id });
        } else {
          rowMappings.push({ type: "unknown" });
        }
      }

      rowMappings.push({ type: "evidence" });
      rowMappings.push({ type: "result" });
    }

    const attrRecord: Record<string, string> = {};
    attributes.forEach((attr) => {
      attrRecord[attr.id] = "";
    });

    let weekVal = "";
    let rawEvidenceVal = "";
    let rawResultVal = "";

    cells.forEach((cell, cellIdx) => {
      if (cellIdx < rowMappings.length) {
        const mapping = rowMappings[cellIdx];
        const trimmed = (cell || "").trim();
        if (mapping.type === "week") {
          weekVal = trimmed;
        } else if (mapping.type === "evidence") {
          rawEvidenceVal = trimmed;
        } else if (mapping.type === "result") {
          rawResultVal = trimmed;
        } else if (mapping.type === "attribute") {
          let cleanVal = trimmed;
          if (/^pass$/i.test(trimmed)) {
            cleanVal = "Pass";
          } else if (/^fail$/i.test(trimmed)) {
            cleanVal = "Fail";
          }
          attrRecord[mapping.attributeId] = cleanVal;
        }
      }
    });

    const isWeekEmpty = weekVal === "";
    const isEvidenceEmpty = rawEvidenceVal === "";
    const isResultEmpty = rawResultVal === "";
    const isAttributesEmpty = Object.values(attrRecord).every((val) => val === "");

    if (isWeekEmpty && isEvidenceEmpty && isResultEmpty && isAttributesEmpty) {
      continue;
    }

    let cleanEvidenceVal = rawEvidenceVal;
    if (/^[a-zA-Z]$/.test(rawEvidenceVal)) {
      cleanEvidenceVal = rawEvidenceVal.toUpperCase();
    }

    let cleanResultVal: "Pass" | "Fail" | "" = "Pass";
    if (/^fail$/i.test(rawResultVal)) {
      cleanResultVal = "Fail";
    } else if (rawResultVal === "") {
      cleanResultVal = "";
    }

    newRowsData.push({
      week: weekVal,
      attributes: attrRecord,
      evidence: cleanEvidenceVal,
      result: cleanResultVal,
    });
  }

  if (newRowsData.length > 0) {
    if (activeRowId !== null) {
      return {
        newRowsToImport: newRowsData,
        overrideStartRowId: activeRowId,
        message: `Successfully pasted and overrode ${newRowsData.length} row(s) starting from the selected row!`,
        severity: "success",
      };
    } else {
      return {
        newRowsToImport: newRowsData,
        message: `Successfully pasted and imported ${newRowsData.length} row(s) from Excel!`,
        severity: "success",
      };
    }
  } else {
    return {
      message: "No valid rows found to import from clipboard.",
      severity: "warning",
    };
  }
}