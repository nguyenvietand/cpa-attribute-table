"use client";
import { SampleRow, Attribute } from "./mockData";
export type { SampleRow, Attribute };
import React, { useEffect, useRef } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import TableHeader from "./TableHeader";
import TableToolbar from "./TableToolbar";
import TableGrid from "./TableGrid";
import TableFooter from "./TableFooter";
import AddRowDialog from "./AddRowDialog";
import EditRowDialog from "./EditRowDialog";
import { useTableSelection } from "./useTableSelection";
import { useTableData } from "./useTableData";
import { useTableDragDrop } from "./useTableDragDrop";
import AddRowsDialog from "./AddRowsDialog";
import CopyAndPasteDialog from "./CopyAndPasteDialog";

export interface ColumnWidths {
  order?: string | number;
  week?: string | number;
  attributes?: string | number;
  evidence?: string | number;
  result?: string | number;
  comment?: string | number;
  [key: string]: string | number | undefined;
}

interface AdditionalSampleTableProps {
  initialRows: SampleRow[];
  initialAttributes?: Attribute[];
  initialTableNames?: string[];
  initialSelectedTableName?: string;
  initialColumnHeaders?: {
    week: string;
    evidence: string;
    result: string;
    comment: string;
  };
  initialEvidenceOptions?: string[];
  onDataChange?: (snapshot: {
    rows: SampleRow[];
    attributes: Attribute[];
    columnHeaders: {
      week: string;
      evidence: string;
      result: string;
      comment: string;
    };
  }) => void;
  onDeleteAction?: () => void;
  onTableNameChange?: (name: string) => void;
  onTotalSampleChange?: (total: number) => void;
  onTotalErrorChange?: (errors: number) => void;
  onHeightChange?: (height: number) => void;
  maxHeight?: string | number;
  columnWidths?: ColumnWidths;
}

/* DEFAULT TABLE LAYOUT CONFIGURATION */
const DEFAULT_TABLE_CONFIG = {
  maxHeight: 400,
  columnWidths: {
    order: 50,
    week: 200,
    attributes: 300,
    evidence: 300,
    result: 300,
    comment: 300,
  },
};

export default function AdditionalSampleTable({
  initialRows,
  initialAttributes,
  initialTableNames = [],
  initialSelectedTableName,
  initialColumnHeaders,
  initialEvidenceOptions,
  onDataChange,
  onDeleteAction,
  onTableNameChange,
  onTotalSampleChange,
  onTotalErrorChange,
  onHeightChange,
  maxHeight,
  columnWidths,
}: AdditionalSampleTableProps) {

  const {
    isExpanded,
    setIsExpanded,
    rows,
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
    handleSaveRow,
    handleDeleteRow,
    handleDeleteAttribute,
    handleAddAttributeDirect,
    handleUpdateAttribute,
    handleReorderAttributes,
    handlePasteToRange,
    handleUpdateColumnHeader,
    handleToolbarPasteClick,
    handleAddDefaultRow,
    handleAddDefaultRows,
    selectionRange,
    setSelectionRange,
    isSelecting,
    setIsSelecting,
  } = useTableData({
    initialRows,
    initialAttributes,
    initialColumnHeaders,
    initialEvidenceOptions
  });

  const {
    selectedRowIds,
    hasSelection: hasRowSelection,
    toggleRowSelection,
    toggleAllSelection,
    handleCopySelectionDirect,
    handleCopyAll,
    selectionMode,
    toggleSelectionMode,
  } = useTableSelection({
    rows,
    attributes,
    columnHeaders,
    onShowToast: (message) => setSnackbar({ open: true, message }),
    activeRowId,
    selectionRange,
    hasRangeSelection: !!selectionRange,
  });

  const hasSelection = hasRowSelection || !!selectionRange;

  const {
    onCellMouseDown,
    onCellMouseEnter,
    isCellSelected,
    handleCopyRange,
  } = useTableDragDrop({
    rows,
    attributes,
    selectedRowIds,
    activeRowId,
    activeColumnId,


    setActiveRowId,
    setActiveColumnId,

    onCellClick: (rowId, colId) => {
      setActiveRowId(rowId);
      setActiveColumnId(colId);
    },
    onToggleRowSelection: toggleRowSelection,
    onShowToast: (message, severity = "success") =>
      setSnackbar({ open: true, message, severity }),
    selectionRange,
    setSelectionRange,
    isSelecting,
    setIsSelecting,
  });

  const resolvedMaxHeight = maxHeight ?? DEFAULT_TABLE_CONFIG.maxHeight;
  const containerRef = useRef<HTMLDivElement>(null);

  const [prevColumnWidths, setPrevColumnWidths] = React.useState(columnWidths);
  const [currentColumnWidths, setCurrentColumnWidths] =
    React.useState<ColumnWidths>(() => ({
      ...DEFAULT_TABLE_CONFIG.columnWidths,
      ...columnWidths,
    }));

  if (columnWidths !== prevColumnWidths) {
    setPrevColumnWidths(columnWidths);
    setCurrentColumnWidths((prev) => ({
      ...prev,
      ...columnWidths,
    }));
  }

  const [prevInitialSelectedTableName, setPrevInitialSelectedTableName] = React.useState(initialSelectedTableName);

  const [selectedTableName, setSelectedTableName] = React.useState(() => {
    const normalizedDefault = (initialSelectedTableName || "").trim();
    if (normalizedDefault) return normalizedDefault;
    return initialTableNames.length > 0 ? initialTableNames[0] : "";
  });

  if (initialSelectedTableName !== prevInitialSelectedTableName) {
    setPrevInitialSelectedTableName(initialSelectedTableName);
    const normalizedDefault = (initialSelectedTableName || "").trim();

    if (normalizedDefault) {
      setSelectedTableName(normalizedDefault);
    } else if (initialTableNames.length > 0) {
      setSelectedTableName(initialTableNames[0]);
    }
  }

  useEffect(() => {
    if (!containerRef.current || !onHeightChange) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        onHeightChange(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [onHeightChange]);

  React.useEffect(() => {
    if (selectedTableName) {
      onTableNameChange?.(selectedTableName);
    }
  }, [selectedTableName, onTableNameChange]);

  React.useEffect(() => {
    onTotalSampleChange?.(totalSamples);
  }, [totalSamples, onTotalSampleChange]);

  React.useEffect(() => {
    onTotalErrorChange?.(totalErrors);
  }, [totalErrors, onTotalErrorChange]);

  React.useEffect(() => {
    onDataChange?.({
      rows,
      attributes,
      columnHeaders,
    });
  }, [rows, attributes, columnHeaders, onDataChange]);

  const isSingleCellSelection =
    !selectionRange ||
    (
      selectionRange.start.rowId === selectionRange.end.rowId &&
      selectionRange.start.colId === selectionRange.end.colId
    );

  const hasNoActiveCell =
    activeColumnId === null || activeColumnId === undefined;

  const shouldCopyRows =
    selectedRowIds.size > 0 &&
    (activeColumnId === "order" || hasNoActiveCell) &&
    isSingleCellSelection;

  const rowOptions = Array.from({ length: rows.length }, (_, i) => i + 1);
  const attributeOptions = [
    { id: "week", name: columnHeaders.week },
    ...attributes.map((attr) => ({ id: attr.id, name: attr.name })),
    { id: "evidence", name: columnHeaders.evidence },
    { id: "result", name: columnHeaders.result },
    { id: "comment", name: columnHeaders.comment },
  ];
  const handleCopyPasteApply = (data: {
    fromRow: number;
    toRow: number;
    attributeIds: string[];
    pasteContent: string;
  }) => {
    handlePasteToRange(data.fromRow, data.toRow, data.attributeIds, data.pasteContent);
  };

  return (
    <div ref={containerRef} className="w-full flex flex-col border! border-gray-200! rounded-lg overflow-hidden bg-white!">
      <Accordion
        expanded={isExpanded}
        onChange={() => setIsExpanded(!isExpanded)}
        className="shadow-none! border-0! rounded-none! overflow-hidden bg-transparent!"
        sx={{ display: 'flex', flexDirection: 'column', boxShadow: 'none', border: 0, borderRadius: 0, backgroundColor: 'transparent', minHeight: 0, flex: '0 0 auto' }}
        disableGutters>
        <AccordionSummary
          className="bg-gray-50/75! border-b! border-gray-200! px-6! py-1! min-h-0! Mui-expanded:!min-h-0"
          sx={{ flexShrink: 0 }}
          classes={{ content: "!my-2 Mui-expanded:!my-2" }}>
          <TableHeader
            isExpanded={isExpanded}
            totalSamples={totalSamples}
            totalErrors={totalErrors}
            title={selectedTableName}
          />
        </AccordionSummary>

        <AccordionDetails className="p-0! border-0!" sx={{ p: 0, borderTop: 0, display: 'flex', flexDirection: 'column' }}>
          <TableToolbar
            onAddRowClick={() => setIsAddRowOpen(true)}
            onPasteClick={handleToolbarPasteClick}
            onCopyPasteClick={() => setIsCopyPasteOpen(true)}
            selectionMode={selectionMode}
            onToggleSelectionMode={toggleSelectionMode}
            onCopySelection={
              shouldCopyRows
                ? handleCopySelectionDirect
                : handleCopyRange
            }
            onCopyAll={handleCopyAll}
            hasSelection={hasSelection}
            tableNames={initialTableNames}
            selectedTableName={selectedTableName}
            onSelectedTableNameChange={setSelectedTableName}
            onDeleteAction={onDeleteAction}
          />

          <TableGrid
            rows={rows}
            attributes={attributes}
            rowStartIndex={0}
            onAttrChange={handleAttrChange}
            onDeleteAttribute={handleDeleteAttribute}
            onResultChange={handleResultChange}
            onEvidenceChange={handleEvidenceChange}
            evidenceOptions={evidenceOptions}
            onWeekChange={handleWeekChange}
            onCommentChange={handleCommentChange}
            onAddAttribute={handleAddAttributeDirect}
            onUpdateAttribute={handleUpdateAttribute}
            onReorderAttributes={handleReorderAttributes}
            columnHeaders={columnHeaders}
            onUpdateColumnHeader={handleUpdateColumnHeader}
            onEditClick={setEditingRow}
            onDeleteRow={handleDeleteRow}
            maxHeight={resolvedMaxHeight}
            columnWidths={currentColumnWidths}
            onColumnResize={(columnId, newWidth) => {
              setCurrentColumnWidths((prev) => ({
                ...prev,
                [columnId]: newWidth,
              }));
            }}
            onAddRow={handleAddDefaultRow}
            selectedRowIds={selectedRowIds}
            onToggleRowSelection={toggleRowSelection}
            onToggleAllSelection={toggleAllSelection}
            selectionMode={selectionMode}
            activeRowId={activeRowId}
            activeColumnId={activeColumnId}
            onCellMouseDown={onCellMouseDown}
            onCellMouseEnter={onCellMouseEnter}
            isCellSelected={isCellSelected}
            selectionRange={selectionRange}
          />

          <TableFooter />
        </AccordionDetails>
      </Accordion>

      {/* {isAddRowOpen && (
        <AddRowDialog
          open={isAddRowOpen}
          onClose={() => setIsAddRowOpen(false)}
          attributes={attributes}
          evidenceOptions={evidenceOptions}
          onAdd={handleAddRow}
        />
      )} */}
      {isAddRowOpen && (
        <AddRowsDialog
          open={isAddRowOpen}
          onClose={() => setIsAddRowOpen(false)}
          onAdd={handleAddDefaultRows}
        />
      )}

      {isCopyPasteOpen && (
        <CopyAndPasteDialog
          open={isCopyPasteOpen}
          onClose={() => setIsCopyPasteOpen(false)}
          rowOptions={rowOptions}
          attributeOptions={attributeOptions}
          onApply={handleCopyPasteApply}
        />
      )}

      {editingRow && (
        <EditRowDialog
          open={!!editingRow}
          onClose={() => setEditingRow(null)}
          row={editingRow}
          attributes={attributes}
          evidenceOptions={evidenceOptions}
          onSave={handleSaveRow}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity || "success"}
          variant="filled"
          sx={{ width: "100%", fontSize: "0.8rem" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}