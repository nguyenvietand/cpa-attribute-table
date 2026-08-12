import { SampleRow, Attribute } from "../mockData";

export interface PasteResult {
  updatedRows?: SampleRow[];
  newRowsToImport?: Omit<SampleRow, "id">[];
  overrideStartRowId?: number;
  message?: string;
  severity?: "success" | "error" | "warning";
}

function getNextRowId(sourceRows: SampleRow[]): number {
  if (sourceRows.length === 0) return 1;
  const maxId = sourceRows.reduce(
    (max, row) => (Number.isFinite(row.id) && row.id > max ? row.id : max),
    Number.NEGATIVE_INFINITY,
  );
  return Number.isFinite(maxId) ? maxId + 1 : 1;
}

/**
 * Parses and processes TSV data pasted from the clipboard (e.g. Excel).
 * Pure function mirror of useTableData.ts's handleDirectPaste — no React
 * state, so it can be unit tested directly.
 */
export function processPaste(
  text: string,
  rows: SampleRow[],
  attributes: Attribute[],
  activeRowId: number | null,
  activeColumnId: string | null,
): PasteResult {
  if (!text) return {};

  const lines = text.split(/\r?\n/);
  const grid: string[][] = lines.map((line) => line.split("\t").map((cell) => cell.trim()));

  while (
    grid.length > 0 &&
    (grid[grid.length - 1].length === 0 ||
      (grid[grid.length - 1].length === 1 && grid[grid.length - 1][0] === ""))
  ) {
    grid.pop();
  }

  if (grid.length === 0) return {};

  const columnOrder = ["week", ...attributes.map((a) => a.id), "evidence", "result", "comment"];
  const startRowIdx = activeRowId !== null ? rows.findIndex((r) => r.id === activeRowId) : -1;

  const targetColId =
    activeRowId !== null && (activeColumnId === null || activeColumnId === "order")
      ? "week"
      : activeColumnId;
  const startColIdx = targetColId !== null ? columnOrder.indexOf(targetColId) : -1;

  let adjustedGrid = grid;
  if (activeColumnId === "order" && grid.length > 0 && grid[0].length > 1) {
    const firstCell = grid[0][0].toLowerCase();
    const isFirstCellOrder = /^\d+$/.test(firstCell) || firstCell === "order" || firstCell === "id";
    if (isFirstCellOrder) {
      adjustedGrid = grid.map((row) => row.slice(1));
    }
  }

  // ---- Flexible cell-level paste (an active cell is selected) ----
  if (startRowIdx !== -1 && startColIdx !== -1) {
    const pastedRows = adjustedGrid.length;
    const pastedCols = Math.max(...adjustedGrid.map((r) => r.length));
    const remainingRows = rows.length - startRowIdx;
    const remainingCols = columnOrder.length - startColIdx;

    if (pastedRows > remainingRows || pastedCols > remainingCols) {
      return {
        message: "Cannot paste because content exceeds the available range.",
        severity: "error",
      };
    }

    const isMultiCell = adjustedGrid.length > 1 || adjustedGrid.some((row) => row.length > 1);

    if (!isMultiCell) {
      const targetVal = adjustedGrid[0][0];
      const currentTargetColId = columnOrder[startColIdx];
      const updatedRows = rows.map((row, idx) => {
        if (idx !== startRowIdx) return row;
        if (currentTargetColId === "week") {
          return { ...row, week: targetVal };
        } else if (currentTargetColId === "evidence") {
          return { ...row, evidence: targetVal };
        } else if (currentTargetColId === "result") {
          let cleanVal: "Pass" | "Fail" = "Pass";
          if (/^fail$/i.test(targetVal)) {
            cleanVal = "Fail";
          }
          return { ...row, result: cleanVal };
        } else if (currentTargetColId === "comment") {
          return { ...row, comment: targetVal };
        } else {
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
              [currentTargetColId]: cleanVal,
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
      const updatedRows = [...rows];
      let nextId = getNextRowId(updatedRows);

      adjustedGrid.forEach((gridRow, r) => {
        const targetRowIdx = startRowIdx + r;

        if (targetRowIdx >= updatedRows.length) {
          const defaultAttributes: Record<string, string> = {};
          attributes.forEach((attr) => {
            defaultAttributes[attr.id] = "";
          });
          updatedRows.push({
            id: nextId++,
            week: "",
            attributes: defaultAttributes,
            evidence: "",
            result: "Pass",
            comment: "",
          });
        }

        const rowToUpdate = { ...updatedRows[targetRowIdx] };
        rowToUpdate.attributes = { ...rowToUpdate.attributes };

        gridRow.forEach((cellVal, c) => {
          const innerTargetColIdx = startColIdx + c;
          if (innerTargetColIdx < columnOrder.length) {
            const colId = columnOrder[innerTargetColIdx];
            if (colId === "week") {
              rowToUpdate.week = cellVal;
            } else if (colId === "evidence") {
              rowToUpdate.evidence = cellVal;
            } else if (colId === "result") {
              let cleanVal: "Pass" | "Fail" = "Pass";
              if (/^fail$/i.test(cellVal)) {
                cleanVal = "Fail";
              }
              rowToUpdate.result = cleanVal;
            } else if (colId === "comment") {
              rowToUpdate.comment = cellVal;
            } else {
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
        message: "Successfully pasted and overrode cell range starting from selected cell!",
        severity: "success",
      };
    }
  }

  // ---- FALLBACK TO ROW-LEVEL OVERRIDE BEHAVIOR ----
  const filteredGrid = grid.filter((row) => row.length > 0 && row.some((cell) => cell !== ""));
  if (filteredGrid.length === 0) return {};

  let dataStartIndex = 0;
  const firstRow = filteredGrid[0];
  const looksLikeHeader = firstRow.some((cell) => {
    const lower = cell.toLowerCase();
    return (
      lower.includes("week") ||
      lower.includes("order") ||
      lower.includes("evidence") ||
      lower.includes("result") ||
      lower.includes("attribute") ||
      lower.includes("comment")
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
    | { type: "comment" }
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
      } else if (lower.includes("comment")) {
        headerMappings.push({ type: "comment" });
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
            const matchedAttrByNum = attributes.find(
              (attr) =>
                attr.name.toLowerCase().includes(`attribute ${num}`) ||
                attr.name.toLowerCase().includes(`attr ${num}`),
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
    if (cells.length < 3) continue;

    let rowMappings = headerMappings;

    if (!looksLikeHeader) {
      // Tổng số cột kỳ vọng: week + attributes + evidence + result + comment
      const expectedColsWithoutOrder = 1 + attributes.length + 3;
      const expectedColsWithOrder = expectedColsWithoutOrder + 1;

      let hasIdColumn = false;
      if (cells.length === expectedColsWithOrder && /^\d+$/.test(cells[0])) {
        hasIdColumn = true;
      } else if (cells.length === expectedColsWithoutOrder) {
        hasIdColumn = false;
      } else if (cells.length >= 5 && /^\d+$/.test(cells[0])) {
        // Không khớp số cột kỳ vọng nào -> fallback về cách đoán cũ
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
      if (hasIdColumn) rowMappings.push({ type: "order" });
      rowMappings.push({ type: "week" });

      const pastedAttrCount = cells.length - (colOffset + 1 + 3);
      for (let idx = 0; idx < pastedAttrCount; idx++) {
        if (idx < attributes.length) {
          rowMappings.push({ type: "attribute", attributeId: attributes[idx].id });
        } else {
          rowMappings.push({ type: "unknown" });
        }
      }

      rowMappings.push({ type: "evidence" });
      rowMappings.push({ type: "result" });
      rowMappings.push({ type: "comment" });
    }

    const attrRecord: Record<string, string> = {};
    attributes.forEach((attr) => {
      attrRecord[attr.id] = "";
    });

    let weekVal = "";
    let rawEvidenceVal = "";
    let rawResultVal = "";
    let rawCommentVal = "";

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
        } else if (mapping.type === "comment") {
          rawCommentVal = trimmed;
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

    if (
      weekVal === "" &&
      rawEvidenceVal === "" &&
      rawResultVal === "" &&
      rawCommentVal === "" &&
      Object.values(attrRecord).every((val) => val === "")
    ) {
      continue;
    }

    let cleanResultVal: "Pass" | "Fail" = "Pass";
    if (/^fail$/i.test(rawResultVal)) {
      cleanResultVal = "Fail";
    }

    newRowsData.push({
      week: weekVal,
      attributes: attrRecord,
      evidence: rawEvidenceVal,
      result: cleanResultVal,
      comment: rawCommentVal,
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