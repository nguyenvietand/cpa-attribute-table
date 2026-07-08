import { useEffect, useRef, useCallback } from "react";
import { SampleRow, Attribute } from "./index";
import { exportCellRangeToTSV, writeToClipboard } from "./utils/clipboardHelper";

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
}

export function useTableDragDrop({
  rows,
  attributes,
  onCellClick,
  onShowToast,
  selectionRange,
  setSelectionRange,
  isSelecting,
  setIsSelecting,
}: UseTableDragDropProps) {
  const dragTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseDownInfo = useRef<{
    rowId: number;
    colId: string;
    event: React.MouseEvent;
  } | null>(null);

  const isCellSelected = useCallback(
    (rowId: number, colId: string) => {
      console.log("check", rowId, colId, selectionRange);
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

  const onCellMouseDown = useCallback(
    (e: React.MouseEvent, rowId: number, colId: string) => {
      console.log("onCellMouseDown", { rowId, colId });
      if (e.button !== 0) return; // Only trigger for left clicks

      mouseDownInfo.current = { rowId, colId, event: e };

      if (dragTimer.current) clearTimeout(dragTimer.current);

      dragTimer.current = setTimeout(() => {
        setIsSelecting(true);
        setSelectionRange({
          start: { rowId, colId },
          end: { rowId, colId },
        });
        document.body.style.cursor = "cell";
        onCellClick(rowId, colId);
      }, 100);
    },
    [setIsSelecting, setSelectionRange, onCellClick],
  );

  const onCellMouseEnter = useCallback(
    (rowId: number, colId: string) => {
      console.log("mouseenter", {
        rowId,
        colId,
        isSelecting,
      });
      if (isSelecting) {
        setSelectionRange((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            end: { rowId, colId },
          };
        });
      }
    },
    [isSelecting, setSelectionRange],
  );

  // Global mouseup and mousedown handlers to manage selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      console.log("mouseup", {
        isSelecting,
        hasTimer: !!dragTimer.current,
        mouseDownInfo: mouseDownInfo.current,
      });
      if (dragTimer.current) {
        clearTimeout(dragTimer.current);
        dragTimer.current = null;
      }

      if (isSelecting) {
        setIsSelecting(false);
        document.body.style.cursor = "";
      } else if (mouseDownInfo.current) {
        // Trigger normal cell select on fast click
        const { rowId, colId } = mouseDownInfo.current;
        setSelectionRange({
          start: { rowId, colId },
          end: { rowId, colId },
        });
        onCellClick(rowId, colId);
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
      }
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("mousedown", handleGlobalMouseDown);

    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("mousedown", handleGlobalMouseDown);
    };
  }, [isSelecting, onCellClick, setIsSelecting, setSelectionRange]);

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

  // Intercept the copy shortcut for Excel-like TSV formatting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (!selectionRange) return;

        // Find if cursor is currently focused on an editable text control
        const activeEl = document.activeElement;
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
  }, [selectionRange, handleCopyRange]);

  return {
    selectionRange,
    isSelecting,
    onCellMouseDown,
    onCellMouseEnter,
    isCellSelected,
    handleCopyRange,
  };
}
