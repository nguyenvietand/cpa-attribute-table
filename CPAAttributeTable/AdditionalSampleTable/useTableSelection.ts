import { useState, useEffect, useCallback } from "react";
import { SampleRow, Attribute } from "./index";
import {
  writeToClipboard,
  exportSelectionToTSV,
  exportAllToTSV,
} from "./utils/clipboardHelper";
import { SelectionRange } from "./useTableData";
import { getActiveTableContainer, subscribeActiveTableContainer } from "./activeTableRegistry";

interface UseTableSelectionProps {
  rows: SampleRow[];
  attributes: Attribute[];
  columnHeaders: {
    week: string;
    evidence: string;
    result: string;
    comment: string;
  };
  onShowToast: (message: string) => void;
  activeRowId?: number | null;
  hasRangeSelection?: boolean;
  selectionRange?: SelectionRange | null;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function useTableSelection({
  rows,
  attributes,
  columnHeaders,
  onShowToast,
  activeRowId = null,
  hasRangeSelection = false,
  selectionRange = null,
  containerRef,
}: UseTableSelectionProps) {
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      const nextVal = !prev;
      if (!nextVal) {
        setSelectedRowIds(new Set());
      }
      return nextVal;
    });
  };

  const toggleRowSelection = (rowId: number) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const toggleAllSelection = () => {
    setSelectedRowIds((prev) => {
      if (prev.size === rows.length) {
        return new Set();
      } else {
        return new Set(rows.map((r) => r.id));
      }
    });
  };

  const handleCopySelectionDirect = useCallback(() => {
    console.log({
      selectedRowIds,
      activeRowId,
    });
    if (selectedRowIds.size === 0 && typeof activeRowId !== "number") return;

    const { tsvContent, copiedCount } = exportSelectionToTSV(
      rows,
      attributes,
      selectedRowIds,
      activeRowId
    );

    if (tsvContent) {
      writeToClipboard(tsvContent);
      onShowToast(`Successfully copied ${copiedCount} row(s) to clipboard!`);
    }
  }, [selectedRowIds, activeRowId, rows, attributes, onShowToast]);

  const handleCopyAll = () => {
    const tsvContent = exportAllToTSV(rows, attributes, columnHeaders);
    writeToClipboard(tsvContent);
    onShowToast(`Successfully copied entire table (${rows.length} rows) to clipboard in Excel format!`);
  };

  const resetSelection = () => {
    setSelectedRowIds(new Set());
    setSelectionMode(false);
  };

  // Clear selection when another table becomes active
  useEffect(() => {
    const unsubscribe = subscribeActiveTableContainer((activeEl) => {
      const container = containerRef?.current;
      if (!container) return;

      if (activeEl !== container) {
        setSelectedRowIds(new Set());
        setSelectionMode(false);
      }
    });

    return unsubscribe;
  }, [containerRef]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore row copy shortcut if this table is not active
      if (containerRef?.current && getActiveTableContainer() !== containerRef.current) {
        return;
      }

      const shouldHandleRowCopy =
        !hasRangeSelection ||
        (
          selectionRange?.start.rowId === selectionRange?.end.rowId &&
          selectionRange?.start.colId === "order" &&
          selectionRange?.end.colId === "order"
        );

      if (!shouldHandleRowCopy) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        const activeEl = document.activeElement;
        const isTextInput =
          activeEl &&
          (
            (activeEl.tagName === "INPUT" &&
              (activeEl as HTMLInputElement).type !== "checkbox" &&
              (activeEl as HTMLInputElement).type !== "radio") ||
            activeEl.tagName === "TEXTAREA" ||
            activeEl.tagName === "SELECT" ||
            activeEl.getAttribute("contenteditable") === "true"
          );

        if (isTextInput) {
          return;
        }

        if (selectedRowIds.size > 0 || typeof activeRowId === "number") {
          e.preventDefault();
          handleCopySelectionDirect();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedRowIds, activeRowId, handleCopySelectionDirect, hasRangeSelection, selectionRange, containerRef]);

  return {
    selectedRowIds,
    hasSelection: selectedRowIds.size > 0 || typeof activeRowId === "number",
    toggleRowSelection,
    toggleAllSelection,
    resetSelection,
    handleCopySelectionDirect,
    handleCopyAll,
    selectionMode,
    toggleSelectionMode,
  };
}