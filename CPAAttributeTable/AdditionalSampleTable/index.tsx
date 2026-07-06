"use client";
import { SampleRow, Attribute } from "./mockData";
export type { SampleRow, Attribute };
import React from "react";
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
  maxHeight?: string | number;
  columnWidths?: ColumnWidths;
}

/* DEFAULT TABLE LAYOUT CONFIGURATION */
const DEFAULT_TABLE_CONFIG = {
  // Set the maximum height of the table body
  maxHeight: 400,
  // Set the width (in pixels) for each column in the table
  columnWidths: {
    order: 50,
    week: 140,
    attributes: 300,
    evidence: 300,
    result: 200,
    comment: 200,
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
  maxHeight,
  columnWidths,
}: AdditionalSampleTableProps) {
  // Table Core
  const {
    isExpanded,
    setIsExpanded,
    rows,
    attributes,
    evidenceOptions,
    columnHeaders,
    isAddRowOpen,
    setIsAddRowOpen,
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
    handleUpdateColumnHeader,
    handleToolbarPasteClick,
    handleAddDefaultRow,
  } = useTableData({ initialRows, initialAttributes, initialColumnHeaders, initialEvidenceOptions });

  // Table selection and copy hook
  const {
    selectedRowIds,
    hasSelection,
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
  });

  //  layout configuration from props or DEFAULT_TABLE_CONFIG
  const resolvedMaxHeight = maxHeight ?? DEFAULT_TABLE_CONFIG.maxHeight;

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

  const resolveSelectedTableName = React.useCallback(() => {
    const normalizedDefault = (initialSelectedTableName || "").trim();
    if (normalizedDefault && initialTableNames.includes(normalizedDefault)) {
      return normalizedDefault;
    }
    if (initialTableNames.length > 0) {
      return initialTableNames[0];
    }
    return "";
  }, [initialSelectedTableName, initialTableNames]);

  const [selectedTableName, setSelectedTableName] = React.useState(
    resolveSelectedTableName,
  );

  React.useEffect(() => {
    setSelectedTableName(resolveSelectedTableName());
  }, [resolveSelectedTableName]);

  React.useEffect(() => {
    onDataChange?.({
      rows,
      attributes,
      columnHeaders,
    });
  }, [rows, attributes, columnHeaders, onDataChange]);

  return (
    <div className="w-full flex flex-col">
      <Accordion
        expanded={isExpanded}
        onChange={() => setIsExpanded(!isExpanded)}
        className="shadow-none! border-0! rounded-none! overflow-hidden bg-transparent! flex-1"
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
        {/* end of accordion header*/}
        <AccordionDetails className="p-0! border-0!" sx={{ p: 0, borderTop: 0, display: 'flex', flexDirection: 'column' }}>
          <TableToolbar
            onAddRowClick={() => setIsAddRowOpen(true)}
            onPasteClick={handleToolbarPasteClick}
            selectionMode={selectionMode}
            onToggleSelectionMode={toggleSelectionMode}
            onCopySelection={handleCopySelectionDirect}
            onCopyAll={handleCopyAll}
            hasSelection={hasSelection}
            tableNames={initialTableNames}
            selectedTableName={selectedTableName}
            onSelectedTableNameChange={setSelectedTableName}
            onDeleteAction={onDeleteAction}
          />

          {/* Table Grid rows */}
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
            onCellClick={(rowId, colId) => {
              setActiveRowId(rowId);
              setActiveColumnId(colId);
            }}
          />

          {/* Table Footer  */}
          <TableFooter />
        </AccordionDetails>
      </Accordion>

      {isAddRowOpen && (
        <AddRowDialog
          open={isAddRowOpen}
          onClose={() => setIsAddRowOpen(false)}
          attributes={attributes}
          evidenceOptions={evidenceOptions}
          onAdd={handleAddRow}
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

      {/* Snackbar notification for clipboard events */}
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
