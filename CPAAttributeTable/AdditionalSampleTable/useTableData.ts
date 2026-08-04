"use client";
import { useState, useEffect, useCallback } from "react";
import { SampleRow, Attribute } from "./mockData";
import { arrayMove } from "@dnd-kit/sortable";
import { splitEvidenceValue, joinEvidenceValues } from "./evidenceUtils";

export interface SelectionRange {
  start: { rowId: number; colId: string };
  end: { rowId: number; colId: string };
}

const DEFAULT_COLUMN_HEADERS = {
  week: "Sample ID",
  evidence: "Supporting Evidence per Attribute",
  result: "Control Sample Assessment Result (Pass/Fail)",
  comment: "Comment",
};

interface UseTableDataProps {
  initialRows: SampleRow[];
  initialAttributes?: Attribute[];
  initialColumnHeaders?: {
    week: string;
    evidence: string;
    result: string;
    comment: string;
  };
  initialEvidenceOptions?: string[];
}

export function useTableData({
  initialRows,
  initialAttributes = [],
  initialColumnHeaders = DEFAULT_COLUMN_HEADERS,
  initialEvidenceOptions = [],
}: UseTableDataProps) {

  const getNextRowId = useCallback((sourceRows: SampleRow[]): number => {
    if (sourceRows.length === 0) return 1;
    const maxId = sourceRows.reduce(
      (max, row) => (Number.isFinite(row.id) && row.id > max ? row.id : max),
      Number.NEGATIVE_INFINITY,
    );
    return Number.isFinite(maxId) ? maxId + 1 : 1;
  }, []);

  const normalizeAttributeLayout = useCallback((sourceAttributes: Attribute[]): Attribute[] => {
    return sourceAttributes.map((attr, idx) => ({
      ...attr,
      name: `Attribute ${idx + 1}`,
      description: attr.description,
      order: idx + 2,
    }));
  }, []);

  // expand/collapse state
  const [isExpanded, setIsExpanded] = useState(true);

  // Table rows editable state
  const [rows, setRows] = useState<SampleRow[]>(initialRows);

  // Active attributes state
  const [attributes, setAttributes] = useState<Attribute[]>(initialAttributes);
  const [evidenceOptions, setEvidenceOptions] = useState<string[]>(initialEvidenceOptions);

  // Column headers editable state
  const [columnHeaders, setColumnHeaders] = useState(initialColumnHeaders);

  // Dialog open state
  const [isAddRowOpen, setIsAddRowOpen] = useState(false);

  // Copy & Paste dialog open state
  const [isCopyPasteOpen, setIsCopyPasteOpen] = useState(false);

  // Editing row state
  const [editingRow, setEditingRow] = useState<SampleRow | null>(null);

  // Snackbar Toast notification state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity?: "success" | "error" | "warning" | "info";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Track the active row clicked by the user for paste override functionality
  const [activeRowId, setActiveRowId] = useState<number | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);

  // Handlers for modifying values (for interactive feel)
  const handleAttrChange = (
    id: number,
    attributeId: string,
    value: string,
  ) => {
    setRows(
      rows.map((row) =>
        row.id === id ?
          {
            ...row,
            attributes: {
              ...row.attributes,
              [attributeId]: value,
            },
          }
          : row,
      ),
    );
  };

  const handleResultChange = (id: number, value: "Pass" | "Fail" | "") => {
    setRows(
      rows.map((row) => (row.id === id ? { ...row, result: value } : row)),
    );
  };

  const handleEvidenceChange = (id: number, value: string) => {
    setRows(
      rows.map((row) => (row.id === id ? { ...row, evidence: value } : row)),
    );
  };

  const handleWeekChange = (id: number, value: string) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, week: value } : row)));
  };

  const handleCommentChange = (id: number, value: string) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, comment: value } : row)));
  };

  // Add row handler
  const handleAddRow = (newRowData: Omit<SampleRow, "id">) => {
    setRows((prevRows) => [
      ...prevRows,
      {
        id: getNextRowId(prevRows),
        ...newRowData,
      },
    ]);
  };

  // Add multiple rows handler
  const handleImportRows = useCallback((newRowsData: Omit<SampleRow, "id">[]) => {
    setRows((prevRows) => {
      let nextId = getNextRowId(prevRows);
      const newRows: SampleRow[] = newRowsData.map((row) => ({
        id: nextId++,
        ...row,
      }));
      return [...prevRows, ...newRows];
    });
  }, [getNextRowId]);

  // Override rows starting from a specific row ID
  const handleOverrideRows = useCallback((
    startRowId: number,
    newRowsData: Omit<SampleRow, "id">[],
  ) => {
    setRows((prevRows) => {
      const startIndex = prevRows.findIndex((row) => row.id === startRowId);
      if (startIndex === -1) return prevRows;

      const updatedRows = [...prevRows];
      let nextId = getNextRowId(updatedRows);

      newRowsData.forEach((newData, offset) => {
        const targetIndex = startIndex + offset;
        if (targetIndex < updatedRows.length) {
          updatedRows[targetIndex] = {
            id: updatedRows[targetIndex].id,
            week: newData.week,
            evidence: newData.evidence,
            result: newData.result,
            attributes: newData.attributes,
            comment: newData.comment,
          };
        } else {
          updatedRows.push({
            id: nextId++,
            ...newData,
          });
        }
      });

      return updatedRows;
    });
  }, [getNextRowId]);

  // Direct clipboard paste handler
  const handleDirectPaste = useCallback(
    (text: string) => {
      if (!text) return;

      const lines = text.split(/\r?\n/);
      const grid: string[][] = lines
        .map((line) => line.split("\t").map((cell) => cell.trim()));

      while (
        grid.length > 0 &&
        (grid[grid.length - 1].length === 0 ||
          (grid[grid.length - 1].length === 1 && grid[grid.length - 1][0] === ""))
      ) {
        grid.pop();
      }

      if (grid.length === 0) return;

      const columnOrder = ["week", ...attributes.map((a) => a.id), "evidence", "result", "comment"];
      const startRowIdx = activeRowId !== null ? rows.findIndex((r) => r.id === activeRowId) : -1;

      const targetColId =
        activeRowId !== null && (activeColumnId === null || activeColumnId === "order") ?
          "week"
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

      if (startRowIdx !== -1 && startColIdx !== -1) {
        const pastedRows = adjustedGrid.length;
        const pastedCols = Math.max(...adjustedGrid.map((r) => r.length));
        const remainingRows = rows.length - startRowIdx;
        const remainingCols = columnOrder.length - startColIdx;

        if (pastedRows > remainingRows || pastedCols > remainingCols) {
          setSnackbar({
            open: true,
            message: "Cannot copy due to exceed copy range",
            severity: "error",
          });
          return;
        }

        const isMultiCell = adjustedGrid.length > 1 || adjustedGrid.some((row) => row.length > 1);

        if (!isMultiCell) {
          const targetVal = adjustedGrid[0][0];
          const currentTargetColId = columnOrder[startColIdx];
          setRows((prevRows) =>
            prevRows.map((row, idx) => {
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
            })
          );
          setSnackbar({
            open: true,
            message: "Successfully pasted value to the selected cell!",
            severity: "success",
          });
        } else {
          setRows((prevRows) => {
            const updatedRows = [...prevRows];
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

            return updatedRows;
          });
          setSnackbar({
            open: true,
            message: `Successfully pasted and overrode cell range starting from selected cell!`,
            severity: "success",
          });
        }
        return;
      }

      // --- FALLBACK TO ROW-LEVEL OVERRIDE BEHAVIOR ---
      const filteredGrid = grid.filter((row) => row.length > 0 && row.some((cell) => cell !== ""));
      if (filteredGrid.length === 0) return;

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
        if (cells.length < 3) continue;

        let rowMappings = headerMappings;

        if (!looksLikeHeader) {
          let hasIdColumn = false;
          if (cells.length >= 5 && /^\d+$/.test(cells[0])) {
            const secondCellLower = cells[1].toLowerCase();
            const isSecondCellAttribute =
              secondCellLower === "pass" || secondCellLower === "fail" || secondCellLower === "n/a" || secondCellLower === "";
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

        if (weekVal === "" && rawEvidenceVal === "" && rawResultVal === "" && rawCommentVal === "" && Object.values(attrRecord).every((val) => val === "")) {
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
          handleOverrideRows(activeRowId, newRowsData);
          setSnackbar({
            open: true,
            message: `Successfully pasted and overrode ${newRowsData.length} row(s) starting from the selected row!`,
            severity: "success",
          });
        } else {
          handleImportRows(newRowsData);
          setSnackbar({
            open: true,
            message: `Successfully pasted and imported ${newRowsData.length} row(s) from Excel!`,
            severity: "success",
          });
        }
      } else {
        setSnackbar({
          open: true,
          message: "No valid rows found to import from clipboard.",
          severity: "warning",
        });
      }
    },
    [attributes, handleImportRows, handleOverrideRows, activeRowId, activeColumnId, rows, getNextRowId]
  );

  // Toolbar Paste button handler
  const handleToolbarPasteClick = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleDirectPaste(text);
    } catch (err) {
      console.error("Failed to read clipboard text", err);
      setSnackbar({
        open: true,
        message: "Could not access clipboard. Please use Ctrl + V to paste.",
        severity: "warning",
      });
    }
  };

  // Keyboard shortcut listener for Ctrl + V
  useEffect(() => {
    const handlePasteEvent = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      const isTextInput =
        activeEl &&
        ((activeEl.tagName === "INPUT" &&
          (activeEl as HTMLInputElement).type !== "checkbox" &&
          (activeEl as HTMLInputElement).type !== "radio") ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          activeEl.getAttribute("contenteditable") === "true");

      const text = e.clipboardData?.getData("text/plain") || "";
      if (!text) return;

      const hasTab = text.includes("\t");
      const hasNewline = text.trim().includes("\n") || text.trim().includes("\r");
      const isMultiCell = hasTab || hasNewline;

      const isMultiCellRange = selectionRange && (selectionRange.start.rowId !== selectionRange.end.rowId || selectionRange.start.colId !== selectionRange.end.colId);

      if (isTextInput && !isMultiCell && !isMultiCellRange) {
        return;
      }

      e.preventDefault();
      if (activeEl instanceof HTMLElement) {
        activeEl.blur();
      }
      handleDirectPaste(text);
    };

    window.addEventListener("paste", handlePasteEvent);
    return () => {
      window.removeEventListener("paste", handlePasteEvent);
    };
  }, [handleDirectPaste, selectionRange]);

  // Add default row handler
  const handleAddDefaultRow = () => {
    const defaultAttributes: Record<string, string> = {};
    attributes.forEach((attr) => {
      defaultAttributes[attr.id] = "";
    });
    handleAddRow({
      week: "",
      attributes: defaultAttributes,
      evidence: "",
      result: "",
      comment: "",
    });
  };

  // Add multiple default rows handler
  const handleAddDefaultRows = (quantity: number) => {
    const defaultAttributes: Record<string, string> = {};
    attributes.forEach((attr) => {
      defaultAttributes[attr.id] = "";
    });

    Array.from({ length: quantity }).forEach(() => {
      handleAddRow({
        week: "",
        attributes: defaultAttributes,
        evidence: "",
        result: "",
        comment: "",
      });
    });
  };

  // Save edited row handler
  const handleSaveRow = (updatedRow: SampleRow) => {
    setRows(
      rows.map((row) => (row.id === updatedRow.id ? updatedRow : row)),
    );
    setEditingRow(null);
  };

  // Delete row handler
  const handleDeleteRow = (id: number) => {
    setRows(rows.filter((row) => row.id !== id));
  };

  // Delete attribute handler
  const handleDeleteAttribute = (id: string) => {
    const filteredAttributes = attributes.filter((attr) => attr.id !== id);
    const reindexedAttributes = normalizeAttributeLayout(filteredAttributes);
    setAttributes(reindexedAttributes);
    setRows(
      rows.map((row) => {
        const newAttrs = { ...row.attributes };
        delete newAttrs[id];
        return {
          ...row,
          attributes: newAttrs,
        };
      }),
    );
  };

  // Add attribute directly
  const handleAddAttributeDirect = (targetIndex?: number) => {
    const newId = `attr_${Date.now()}`;
    const insertIdx = targetIndex !== undefined ? targetIndex : attributes.length;
    const newAttr: Attribute = {
      id: newId,
      name: "",
      columnName: "",
      description: "Enter description...",
      order: insertIdx + 2,
    };

    const updatedAttributes = [...attributes];
    updatedAttributes.splice(insertIdx, 0, newAttr);

    const reindexedAttributes = normalizeAttributeLayout(updatedAttributes);

    setAttributes(reindexedAttributes);
    setRows(
      rows.map((row) => ({
        ...row,
        attributes: {
          ...row.attributes,
          [newId]: "",
        },
      })),
    );
  };

  // Update attribute inline
  const handleUpdateAttribute = (id: string, updatedFields: Partial<Attribute>) => {
    setAttributes(
      attributes.map((attr) =>
        attr.id === id ? { ...attr, ...updatedFields } : attr,
      ),
    );
  };

  // Reorder attributes list
  const handleReorderAttributes = (activeId: string, overId: string) => {
    setAttributes((prev) => {
      const oldIndex = prev.findIndex((attr) => attr.id === activeId);
      const newIndex = prev.findIndex((attr) => attr.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const newAttributes = arrayMove(prev, oldIndex, newIndex);

      return normalizeAttributeLayout(newAttributes);
    });
  };

  // Update column header inline
  const handleUpdateColumnHeader = (
    key: "week" | "evidence" | "result" | "comment",
    value: string,
  ) => {
    setColumnHeaders((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Reset handler to restore state to mock defaults
  const handleReset = (callback?: () => void) => {
    setRows(initialRows);
    setAttributes(normalizeAttributeLayout(initialAttributes));
    setColumnHeaders(initialColumnHeaders);
    if (callback) {
      callback();
    }
  };

  // Paste a value into a range of rows for the selected attributes
  const handlePasteToRange = (
    fromRow: number,
    toRow: number,
    columnIds: string[],
    pasteContent: string,
  ) => {
    if (columnIds.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select at least one column.",
        severity: "warning",
      });
      return;
    }

    const start = Math.min(fromRow, toRow);
    const end = Math.max(fromRow, toRow);

    setRows((prevRows) =>
      prevRows.map((row, idx) => {
        const rowNumber = idx + 1;
        if (rowNumber < start || rowNumber > end) return row;

        const updatedRow: SampleRow = {
          ...row,
          attributes: { ...row.attributes },
        };

        columnIds.forEach((colId) => {
          if (colId === "week") {
            updatedRow.week = pasteContent;
          } else if (colId === "evidence") {
            const pastedValues = splitEvidenceValue(pasteContent);
            const matchedValues: string[] = [];
            pastedValues.forEach((pv) => {
              const matchedOption = evidenceOptions.find(
                (opt) => opt.toLowerCase() === pv.toLowerCase(),
              );
              if (matchedOption && !matchedValues.includes(matchedOption)) {
                matchedValues.push(matchedOption);
              }
            });
            if (matchedValues.length > 0) {
              updatedRow.evidence = joinEvidenceValues(matchedValues);
            }
          } else if (colId === "result") {
            if (/^pass$/i.test(pasteContent)) {
              updatedRow.result = "Pass";
            } else if (/^fail$/i.test(pasteContent)) {
              updatedRow.result = "Fail";
            }
          } else if (colId === "comment") {
            updatedRow.comment = pasteContent;
          } else {
            // attribute column
            let cleanVal = pasteContent;
            if (/^pass$/i.test(pasteContent)) cleanVal = "Pass";
            else if (/^fail$/i.test(pasteContent)) cleanVal = "Fail";
            updatedRow.attributes[colId] = cleanVal;
          }
        });

        return updatedRow;
      }),
    );

    setSnackbar({
      open: true,
      message: `Successfully pasted value into row ${start} to ${end}!`,
      severity: "success",
    });
  };

  // Sync logic when component mounts or initial props changes
  useEffect(() => {
    setRows(initialRows);
    setAttributes(normalizeAttributeLayout(initialAttributes));
    setColumnHeaders(initialColumnHeaders);
  }, [initialRows, initialAttributes, initialColumnHeaders, normalizeAttributeLayout]);

  useEffect(() => {
    setEvidenceOptions(initialEvidenceOptions);
  }, [initialEvidenceOptions]);

  const totalSamples = rows.length;
  const totalErrors = rows.filter((row) => {
    const hasFailAttr = attributes.some(
      (attr) => row.attributes[attr.id] === "Fail",
    );
    return hasFailAttr || row.result === "Fail";
  }).length;

  return {
    isExpanded,
    setIsExpanded,
    rows,
    setRows,
    attributes,
    evidenceOptions,
    columnHeaders,
    isAddRowOpen,
    setIsAddRowOpen,
    isCopyPasteOpen,
    setIsCopyPasteOpen,
    editingRow,
    setEditingRow,
    totalSamples,
    totalErrors,
    snackbar,
    setSnackbar,
    activeRowId,
    setActiveRowId,
    activeColumnId,
    setActiveColumnId,
    handleAttrChange,
    handleResultChange,
    handleEvidenceChange,
    handleWeekChange,
    handleCommentChange,
    handleAddRow,
    handleImportRows,
    handleOverrideRows,
    handleAddDefaultRow,
    handleAddDefaultRows,
    handleSaveRow,
    handleDeleteRow,
    handleDeleteAttribute,
    handleAddAttributeDirect,
    handleUpdateAttribute,
    handleReorderAttributes,
    handlePasteToRange,
    handleUpdateColumnHeader,
    handleToolbarPasteClick,
    selectionRange,
    setSelectionRange,
    isSelecting,
    setIsSelecting,
    handleReset,
  };
}