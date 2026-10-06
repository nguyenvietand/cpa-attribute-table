import { useState, useEffect, useRef, useCallback } from "react";
import { SampleRow, Attribute } from "./index";
import { exportCellRangeToTSV, writeToClipboard } from "./utils/clipboardHelper";
import { getActiveTableContainer } from "./activeTableRegistry";

interface SelectionRange {
  start: { rowId: number; colId: string };
  end: { rowId: number; colId: string };
}

interface UseTableDragDropProps {
  rows: SampleRow[];
  attributes: Attribute[];
  selectedRowIds: Set<number>;
  activeRowId: number | null;
  activeColumnId: string | null;

  setActiveRowId: React.Dispatch<React.SetStateAction<number | null>>;
  setActiveColumnId: React.Dispatch<React.SetStateAction<string | null>>;

  onCellClick: (rowId: number | null, columnId: string | null) => void;
  onToggleRowSelection: (rowId: number) => void;
  onShowToast: (
    message: string,
    severity?: "success" | "error" | "warning" | "info",
  ) => void;
  selectionRange: SelectionRange | null;
  setSelectionRange: React.Dispatch<
    React.SetStateAction<SelectionRange | null>
  >;
  isSelecting: boolean;
  setIsSelecting: React.Dispatch<React.SetStateAction<boolean>>;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  disabled?: boolean;
  onDeleteCells?: () => void;
}

export function useTableDragDrop({
  rows,
  attributes,
  activeRowId,
  activeColumnId,
  setActiveRowId,
  setActiveColumnId,

  onCellClick,
  onShowToast,
  selectionRange,
  setSelectionRange,
  isSelecting,
  setIsSelecting,
  containerRef,
  disabled = false,
  onDeleteCells,
}: UseTableDragDropProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const mouseDownInfo = useRef<{
    rowId: number;
    colId: string;
    event: React.MouseEvent;
  } | null>(null);

  const isCellSelected = useCallback(
    (rowId: number, colId: string) => {
      if (!selectionRange) return false;

      const { start, end } = selectionRange;

      const startRowIdx = rows.findIndex((r) => r.id === start.rowId);
      const endRowIdx = rows.findIndex((r) => r.id === end.rowId);
      const currentRowIdx = rows.findIndex((r) => r.id === rowId);

      const allColumns = [
        "order",
        "week",
        ...attributes.map((a) => a.id),
        "evidence",
        "result",
        "comment",
      ];
      const startColIdx = allColumns.indexOf(start.colId);
      const endColIdx = allColumns.indexOf(end.colId);
      const currentColIdx = allColumns.indexOf(colId);

      if (
        startRowIdx === -1 ||
        endRowIdx === -1 ||
        currentRowIdx === -1 ||
        startColIdx === -1 ||
        endColIdx === -1 ||
        currentColIdx === -1
      ) {
        return false;
      }

      const minRow = Math.min(startRowIdx, endRowIdx);
      const maxRow = Math.max(startRowIdx, endRowIdx);
      const minCol = Math.min(startColIdx, endColIdx);
      const maxCol = Math.max(startColIdx, endColIdx);

      return (
        currentRowIdx >= minRow &&
        currentRowIdx <= maxRow &&
        currentColIdx >= minCol &&
        currentColIdx <= maxCol
      );
    },
    [selectionRange, rows, attributes],
  );

  const allColumns = [
    "order",
    "week",
    ...attributes.map(a => a.id),
    "evidence",
    "result",
    "comment",
  ];

  const focusCell = useCallback((rowId: number, colId: string) => {
    requestAnimationFrame(() => {
      const cell = containerRef?.current
        ? containerRef.current.querySelector<HTMLElement>(`td[data-row-id="${rowId}"][data-col-id="${colId}"]`)
        : document.querySelector<HTMLElement>(`td[data-row-id="${rowId}"][data-col-id="${colId}"]`);
      if (!cell) return;

      // Never steal focus if an input or textarea inside this cell is currently focused
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" || active.tagName === "TEXTAREA") &&
        cell.contains(active)
      ) {
        return;
      }

      cell.tabIndex = -1;
      cell.focus({ preventScroll: true });
    });
  }, [containerRef]);

  const onCellMouseDown = useCallback(
    (e: React.MouseEvent, rowId: number, colId: string) => {
      if (e.button !== 0) return; // Only trigger for left clicks
      if (e.detail >= 2) return; // Double-clicks should not trigger cell selection or steal focus

      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }

      mouseDownInfo.current = { rowId, colId, event: e };
      setSelectionRange({
        start: { rowId, colId },
        end: { rowId, colId },
      });
      onCellClick(rowId, colId);
      focusCell(rowId, colId);
      setIsEditMode(false);
    },
    [setSelectionRange, onCellClick, focusCell, setIsEditMode],
  );

  const onCellMouseEnter = useCallback(
    (e: React.MouseEvent, rowId: number, colId: string) => {
      // If left mouse button is NOT pressed, cancel any active drag selection
      if (e.buttons !== 1) {
        if (isSelecting) {
          setIsSelecting(false);
          document.body.style.cursor = "";
        }
        mouseDownInfo.current = null;
        return;
      }

      if (mouseDownInfo.current) {
        if (!isSelecting) {
          setIsSelecting(true);
          document.body.style.cursor = "cell";
        }
        setSelectionRange({
          start: {
            rowId: mouseDownInfo.current.rowId,
            colId: mouseDownInfo.current.colId,
          },
          end: { rowId, colId },
        });
      }
    },
    [isSelecting, setIsSelecting, setSelectionRange],
  );

  // Global mouseup, dragend, and mousedown handlers to manage selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        setIsSelecting(false);
        document.body.style.cursor = "";
      }
      mouseDownInfo.current = null;
    };

    const handleGlobalDragEnd = () => {
      if (isSelecting) {
        setIsSelecting(false);
        document.body.style.cursor = "";
      }
      mouseDownInfo.current = null;
    };

    const handleGlobalMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Clear selection if clicking outside tbody, except for buttons, toolbars, and dialogs
      if (
        !target.closest("tbody") &&
        !target.closest("button") &&
        !target.closest(".MuiButtonBase-root") &&
        !target.closest("[role='dialog']")
      ) {
        setSelectionRange(null);
        onCellClick(null, null);
        setIsEditMode(false);
      }
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("dragend", handleGlobalDragEnd);
    window.addEventListener("mousedown", handleGlobalMouseDown);

    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("dragend", handleGlobalDragEnd);
      window.removeEventListener("mousedown", handleGlobalMouseDown);
    };
  }, [isSelecting, onCellClick, setIsSelecting, setSelectionRange, setIsEditMode]);

  const handleCopyRange = useCallback(() => {
    if (!selectionRange) return;

    const result = exportCellRangeToTSV(rows, attributes, selectionRange);
    if (!result) return;

    const { tsvContent, rowCount, colCount } = result;

    if (tsvContent) {
      writeToClipboard(tsvContent);
      onShowToast(
        `Successfully copied selected cell range (${rowCount}x${colCount}) to clipboard!`,
        "success"
      );
    }
  }, [selectionRange, rows, attributes, onShowToast]);

  const moveToNextCell = useCallback((reverse = false) => {
    const currentEnd =
      selectionRange?.end ??
      (activeRowId !== null && activeColumnId !== null
        ? { rowId: activeRowId, colId: activeColumnId }
        : null);
    if (!currentEnd) return;

    const rowIndex = rows.findIndex(
      r => r.id === currentEnd.rowId
    );

    const colIndex = allColumns.indexOf(
      currentEnd.colId
    );

    if (rowIndex === -1 || colIndex === -1) return;

    let nextRow = rowIndex;
    let nextCol = colIndex + (reverse ? -1 : 1);

    if (reverse) {
      if (isEditMode && nextCol < 1) {
        nextCol = allColumns.length - 1;
        nextRow--;
      } else if (!isEditMode && nextCol < 0) {
        nextCol = allColumns.length - 1;
        nextRow--;
      }
      if (nextRow < 0) return;
    } else {
      if (nextCol >= allColumns.length) {
        nextCol = isEditMode ? 1 : 0;
        nextRow++;
      }
      if (nextRow >= rows.length) return;
    }

    const rowId = rows[nextRow].id;
    const colId = allColumns[nextCol];

    setSelectionRange({
      start: { rowId, colId },
      end: { rowId, colId },
    });

    setActiveRowId(rowId);
    setActiveColumnId(colId);

    onCellClick(rowId, colId);
    if (!isEditMode) {
      focusCell(rowId, colId);
    }
  }, [
    rows,
    allColumns,
    selectionRange,
    activeRowId,
    activeColumnId,
    isEditMode,
    setSelectionRange,
    setActiveRowId,
    setActiveColumnId,
    onCellClick,
    focusCell,
  ]);

  const moveCellByArrow = useCallback((direction: "up" | "down" | "left" | "right") => {
    const currentEnd =
      selectionRange?.end ??
      (activeRowId !== null && activeColumnId !== null
        ? { rowId: activeRowId, colId: activeColumnId }
        : null);
    if (!currentEnd) return;

    const rowIndex = rows.findIndex(r => r.id === currentEnd.rowId);
    const colIndex = allColumns.indexOf(currentEnd.colId);
    if (rowIndex === -1 || colIndex === -1) return;

    let nextRow = rowIndex;
    let nextCol = colIndex;

    if (direction === "up") {
      nextRow = Math.max(0, rowIndex - 1);
    } else if (direction === "down") {
      nextRow = Math.min(rows.length - 1, rowIndex + 1);
    } else if (direction === "left") {
      nextCol = Math.max(0, colIndex - 1);
    } else if (direction === "right") {
      nextCol = Math.min(allColumns.length - 1, colIndex + 1);
    }

    if (nextRow === rowIndex && nextCol === colIndex) return;

    const rowId = rows[nextRow].id;
    const colId = allColumns[nextCol];

    setSelectionRange({
      start: { rowId, colId },
      end: { rowId, colId },
    });

    setActiveRowId(rowId);
    setActiveColumnId(colId);

    onCellClick(rowId, colId);
    if (!isEditMode) {
      focusCell(rowId, colId);
    }
  }, [
    rows,
    allColumns,
    selectionRange,
    activeRowId,
    activeColumnId,
    isEditMode,
    setSelectionRange,
    setActiveRowId,
    setActiveColumnId,
    onCellClick,
    focusCell,
  ]);

  // Intercept keyboard navigation and copy shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keyboard navigation if this table is not active
      if (containerRef?.current && getActiveTableContainer() !== containerRef.current) {
        return;
      }

      const activeEl = document.activeElement;

      // Ignore if typing in an input outside the table (e.g. Header Total Samples/Errors, Dialog)
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
        const isTableCell = activeEl.closest("td[data-row-id]");
        const isTableDropdown = activeEl.closest('[data-portal-dropdown="true"]');
        if (!isTableCell && !isTableDropdown) {
          return;
        }
      }

      // Support F2 key to enter edit mode
      if (e.key === "F2") {
        const hasActiveCell = Boolean(selectionRange || (activeRowId !== null && activeColumnId !== null));
        if (hasActiveCell && !disabled) {
          e.preventDefault();
          e.stopPropagation();
          setIsEditMode(true);
          return;
        }
      }

      // Support Space key to open dropdown for evidence / result in Selection Mode
      if ((e.key === " " || e.key === "Spacebar") && !isEditMode && !disabled) {
        const currentEnd =
          selectionRange?.end ??
          (activeRowId !== null && activeColumnId !== null
            ? { rowId: activeRowId, colId: activeColumnId }
            : null);
        if (currentEnd && (currentEnd.colId === "evidence" || currentEnd.colId === "result")) {
          e.preventDefault();
          e.stopPropagation();
          setIsEditMode(true);
          return;
        }
      }

      // Support Alt + Down to open dropdown for evidence / result
      if (e.altKey && e.key === "ArrowDown" && !disabled) {
        const currentEnd =
          selectionRange?.end ??
          (activeRowId !== null && activeColumnId !== null
            ? { rowId: activeRowId, colId: activeColumnId }
            : null);
        if (currentEnd && (currentEnd.colId === "evidence" || currentEnd.colId === "result")) {
          e.preventDefault();
          e.stopPropagation();
          setIsEditMode(true);
          return;
        }
      }

      // Handle Delete key (clear selected cell/range content in Selection Mode)
      if (e.key === "Delete") {
        if (disabled) return;
        if (isEditMode) return;
        if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
          return;
        }

        // Ignore if a dropdown or dialog is open
        if (
          document.querySelector('[data-portal-dropdown="true"]') ||
          document.querySelector('[role="dialog"]') ||
          document.querySelector('.MuiDialog-root')
        ) {
          return;
        }

        const hasActiveCell = Boolean(selectionRange || (activeRowId !== null && activeColumnId !== null));
        if (!hasActiveCell) return;

        e.preventDefault();
        e.stopPropagation();

        onDeleteCells?.();
        return;
      }

      // Handle Tab key for moving to the next/previous cell
      if (e.key === "Tab") {
        const hasActiveCell = Boolean(selectionRange || (activeRowId !== null && activeColumnId !== null));
        if (!hasActiveCell) return;
        e.preventDefault();
        e.stopPropagation();

        moveToNextCell(e.shiftKey);
        return;
      }

      // Handle Escape key (close dropdown or blur input back to cell selection)
      if (e.key === "Escape") {
        setIsEditMode(false);
        if (document.querySelector('[data-portal-dropdown="true"]')) {
          e.preventDefault();
          e.stopPropagation();
          document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
          return;
        }

        if (activeEl?.closest("td[data-row-id]")) {
          const cell = activeEl.closest<HTMLElement>("td[data-row-id]");
          if (cell) {
            cell.tabIndex = -1;
            cell.focus();
          }
          return;
        }
      }

      // Handle Enter key (move down like Excel)
      if (e.key === "Enter") {
        const hasActiveCell = Boolean(selectionRange || (activeRowId !== null && activeColumnId !== null));
        if (!hasActiveCell) return;

        // If a dropdown is open, let dropdown handle it or ignore
        if (document.querySelector('[data-portal-dropdown="true"]')) {
          return;
        }

        // Ignore if typing in an input outside table
        if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
          const isTableCell = activeEl.closest("td[data-row-id]");
          if (!isTableCell) {
            return;
          }
          // If in textarea and Alt or Ctrl is pressed, allow newline insertion
          if (e.altKey || e.ctrlKey) {
            return;
          }
        }

        e.preventDefault();
        e.stopPropagation();
        moveCellByArrow(e.shiftKey ? "up" : "down");
        return;
      }

      // Handle Arrow keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        const hasActiveCell = Boolean(selectionRange || (activeRowId !== null && activeColumnId !== null));
        if (!hasActiveCell) return;

        const isDropdownSearch = Boolean(activeEl?.closest('[data-portal-dropdown="true"]'));
        if (isDropdownSearch) {
          return;
        }

        const isTextInput =
          activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;

        if (isTextInput && !isDropdownSearch) {
          const { selectionStart, selectionEnd, value } = activeEl;
          const isAllSelected = selectionStart === 0 && selectionEnd === value.length;

          if (e.key === "ArrowLeft") {
            // Only move to left cell if caret is at the beginning or all text is selected
            if (selectionStart !== 0 || (selectionEnd !== 0 && !isAllSelected)) {
              return;
            }
          } else if (e.key === "ArrowRight") {
            // Only move to right cell if caret is at the end or all text is selected
            if (selectionStart !== value.length && !isAllSelected) {
              return;
            }
          } else if (activeEl instanceof HTMLTextAreaElement && value.includes("\n")) {
            // In multi-line textarea, only move between cells if at the very first or last line
            if (e.key === "ArrowUp") {
              const firstNewline = value.indexOf("\n");
              if (selectionStart !== null && selectionStart > firstNewline && !isAllSelected) {
                return;
              }
            } else if (e.key === "ArrowDown") {
              const lastNewline = value.lastIndexOf("\n");
              if (selectionStart !== null && selectionStart <= lastNewline && !isAllSelected) {
                return;
              }
            }
          }
        }

        e.preventDefault();
        e.stopPropagation();
        if (e.key === "ArrowUp") moveCellByArrow("up");
        else if (e.key === "ArrowDown") moveCellByArrow("down");
        else if (e.key === "ArrowLeft") moveCellByArrow("left");
        else if (e.key === "ArrowRight") moveCellByArrow("right");
        return;
      }

      // If cell TD is focused and user types printable key, activate input
      if (
        activeEl?.tagName === "TD" &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !disabled
      ) {
        setIsEditMode(true);
        const input = activeEl.querySelector<HTMLInputElement | HTMLTextAreaElement>(
          'input:not([type="checkbox"]), textarea'
        );
        if (input) {
          input.focus();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (!selectionRange) return;

        const isSingleOrderCell =
          selectionRange.start.rowId === selectionRange.end.rowId &&
          selectionRange.start.colId === "order" &&
          selectionRange.end.colId === "order";

        if (isSingleOrderCell) {
          return;
        }

        const isTextInput =
          activeEl &&
          ((activeEl.tagName === "INPUT" &&
            (activeEl as HTMLInputElement).type !== "checkbox" &&
            (activeEl as HTMLInputElement).type !== "radio") ||
            activeEl.tagName === "TEXTAREA" ||
            activeEl.tagName === "SELECT" ||
            activeEl.getAttribute("contenteditable") === "true");

        const hasActiveTextSelection =
          (
            activeEl &&
            (activeEl instanceof HTMLInputElement ||
              activeEl instanceof HTMLTextAreaElement)
          ) ?
            activeEl.selectionStart !== activeEl.selectionEnd
            : false;

        const isMultiCellRange =
          selectionRange.start.rowId !== selectionRange.end.rowId ||
          selectionRange.start.colId !== selectionRange.end.colId;

        // Fallback to default copy if typing in input and selecting text (only for single cell selection)
        if (isTextInput && hasActiveTextSelection && !isMultiCellRange) return;

        e.preventDefault();
        handleCopyRange();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    selectionRange,
    activeRowId,
    activeColumnId,
    handleCopyRange,
    moveToNextCell,
    moveCellByArrow,
    containerRef,
    disabled,
    isEditMode,
    setIsEditMode,
    onDeleteCells,
  ]);

  return {
    selectionRange,
    isSelecting,
    onCellMouseDown,
    onCellMouseEnter,
    isCellSelected,
    handleCopyRange,
    moveCellByArrow,
    moveToNextCell,
    focusCell,
    isEditMode,
    setIsEditMode,
  };
}
