# Comprehensive Test Cases Checklist - CPA Attribute Table

This document provides a complete, production-grade test suite catalog for the **CPA Attribute Table** (Power Apps PCF Custom Component), derived from a comprehensive audit of the entire codebase (lifecycle, data serialization, Excel-like grid interactions, keyboard navigation, copy/paste engine, dialogs, and responsive layout).

---

## Summary of Test Suites

| Suite ID | Test Suite Domain | Description | Total Cases |
| :--- | :--- | :--- | :---: |
| **01-INIT** | Initialization & PCF Lifecycle | Manifest parameters, dataset paging, JSON parsing, outputs synchronization | 9 |
| **02-CELL** | Excel-Like Cell Editing (`ExcelCellEditor`) | Single/Double click, F2, multiline Alt+Enter, Enter/Tab navigation, focus retention | 14 |
| **03-NAV** | Grid Selection & Keyboard Navigation | Arrow keys, drag range selection, TSV clipboard copy, active cell styles | 8 |
| **04-ROW** | Row Operations (CRUD) | Single row add, batch row add, edit dialog, delete row, totals auto-recalculation | 7 |
| **05-COL** | Dynamic Attributes & Column Management | Add/rename/delete dynamic columns, DnD column reordering, column resizing | 6 |
| **06-SPEC** | Special Columns: Evidence & Result | Multi-select dropdown, search, tag rendering, Pass/Fail toggle, error count updates | 7 |
| **07-CLIP** | Clipboard Engine & Paste Parser | Excel TSV/CSV direct paste, range boundary validation, Copy & Paste mapping dialog | 8 |
| **08-TOOL** | Toolbar & Bulk Operations | Selection mode, select all, batch copy, table deletion event dispatch | 6 |
| **09-HEAD** | Table Header & Totals Override | Table selector, total sample & error override, zero fallback, select-on-focus | 6 |
| **10-UI** | Layout, Accordion & Responsive Design | Sticky headers/columns, maxHeight scrolling, font injection, height reporting | 6 |
| **11-DIS** | Disabled / Read-Only Display Mode | Complete UI lockdown when `isControlDisabled` is true | 8 |
| **TOTAL** | | | **85 Test Cases** |

---

## Suite 1: Initialization & PCF Lifecycle (`01-INIT`)

| Test ID | Test Scenario | Preconditions / Input | Test Steps | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-INIT-01** | Valid `dataJSON` initialization | Control receives well-formed `dataJSON` string with `cells`, `headers`, and `rows`. | Load control in Power Apps harness. | Table renders all rows and columns correctly with corresponding headers (Sample ID, Attributes, Evidence, Result, Comment). | **P0** |
| **TC-INIT-02** | Empty or whitespace `dataJSON` | `dataJSON` is empty string `""` or whitespace. | Initialize control. | Control renders clean default state (0 rows, default column headers), no runtime crash. | **P1** |
| **TC-INIT-03** | Malformed / Corrupted `dataJSON` | `dataJSON` contains invalid JSON syntax (e.g. `"{cells: broken"`). | Initialize control. | `try/catch` catches parsing exception; fallback to safe empty state, no console error unhandled. | **P1** |
| **TC-INIT-04** | Preservation of `WP_ID` across edits | Input JSON contains `WP_ID` for cells. | Edit any cell value in the table. | Emitted `dataJSONOutput` preserves the exact original `WP_ID` for each cell; no `WP_ID` is set to `null` or dropped. | **P0** |
| **TC-INIT-05** | Large Dataset Paging: `tableNameInputList` | `tableNameInputList` contains > 25 records (e.g. 100+ table names). | Initialize control and observe paging behavior. | `requestNextPageIfNeeded` automatically sets `pageSize(5000)` and fetches next pages until 100% of records are loaded into the dropdown. | **P1** |
| **TC-INIT-06** | Large Dataset Paging: `evidenceFileInputList` | `evidenceFileInputList` contains > 25 records. | Initialize control and open Evidence dropdown. | Full evidence files list is fetched and displayed; no items are truncated at 25 records. | **P1** |
| **TC-INIT-07** | Parameter Output Synchronization (`getOutputs`) | Table rows, table name, or totals change. | Trigger any data change. | `notifyOutputChanged()` is called; `getOutputs()` returns accurate `dataJSONOutput`, `tableNameOutput`, `totalSampleOutput`, `totalErrorOutput`, and `heightOutput`. | **P0** |
| **TC-INIT-08** | External `dataJSON` prop change | Control is mounted; external host passes new `dataJSON`. | Update `dataJSON` from parent form. | Component re-synchronizes state with new JSON, unless the change was emitted from the control itself. | **P1** |
| **TC-INIT-09** | Component Teardown (`destroy`) | Control is unmounted from DOM. | Navigate away from screen or close form. | `root.unmount()` executes cleanly; event listeners, timers, and pending page load references are garbage collected. | **P2** |

---

## Suite 2: Excel-Like Cell Editing (`02-CELL`)

| Test ID | Test Scenario | Preconditions / Input | Test Steps | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-CELL-01** | Single-click cell selection | Idle table with rows. | Click once (left mouse button) on any text cell. | Cell is selected with active border (`ring-2 ring-blue-600`, `bg-blue-50/70`). Textarea is **not** rendered; no text caret appears. | **P0** |
| **TC-CELL-02** | Double-click to enter Edit Mode | Cell is idle or selected. | Double-click left mouse button on the cell. | Floating edit overlay expands (`z-index: 40`, `box-shadow: inset 0 0 0 2px #155dfb`, `#eff6ff`). `<textarea>` is mounted and focused; caret is positioned at the end of the text. | **P0** |
| **TC-CELL-03** | `F2` key to enter Edit Mode | Cell is selected. | Press `F2` key on keyboard. | Edit Mode is activated identically to double-click; textarea receives focus with caret at the end. | **P1** |
| **TC-CELL-04** | Single-line typing & instant update | In Edit Mode. | Type alphanumeric characters. | Characters appear immediately; parent state is updated per keystroke via `onChange`. | **P0** |
| **TC-CELL-05** | Multiline line break with `Alt + Enter` | In Edit Mode. | Press `Alt + Enter` (or `Ctrl + Enter`). | Line break (`\n`) is inserted at caret position; textarea and floating overlay expand downwards without shifting table row positions. | **P0** |
| **TC-CELL-06** | Commit and navigate down with `Enter` | In Edit Mode. | Press `Enter` (without Alt/Ctrl). | Edit Mode closes; value is committed; focus and active selection jump immediately to the cell in the row below. | **P0** |
| **TC-CELL-07** | Commit and navigate up with `Shift + Enter` | In Edit Mode. | Press `Shift + Enter`. | Edit Mode closes; value is committed; focus and active selection jump to the cell in the row above. | **P1** |
| **TC-CELL-08** | Commit and navigate right with `Tab` | In Edit Mode. | Press `Tab`. | Edit Mode closes; value is committed; active selection moves to the next column cell. | **P1** |
| **TC-CELL-09** | Commit and navigate left with `Shift + Tab` | In Edit Mode. | Press `Shift + Tab`. | Edit Mode closes; value is committed; active selection moves to the previous column cell. | **P1** |
| **TC-CELL-10** | Cancel editing with `Escape` | In Edit Mode after modifying text. | Press `Escape`. | Edit Mode exits; changes are canceled/blurred; focus remains on the current cell. | **P1** |
| **TC-CELL-11** | Mouse click inside cell during Edit Mode | In Edit Mode. | Click with mouse inside the textarea or on the cell padding. | Textarea **retains focus**; caret repositions to clicked character; text dragging/selection works; no premature blur occurs. | **P0** |
| **TC-CELL-12** | Auto-resizing textarea boundaries | In Edit Mode. | Insert 8+ lines of text using `Alt + Enter`. | Textarea expands smoothly from min 20px up to max 150px height; beyond 150px, vertical scrollbar activates. | **P1** |
| **TC-CELL-13** | Idle display of multiline cells | Cell contains multiline text (`Line 1\nLine 2`). | Exit Edit Mode and view cell in normal grid. | Displays the first non-empty line truncated with ellipsis (`...`); hovering shows native tooltip (`title`) with full text. | **P1** |
| **TC-CELL-14** | Expand button full-text modal | Cell contains long text. | Click the `OpenInFullIcon` expand button on the right side of the cell. | `CellTextDialog` modal opens showing the full multiline text; editing and clicking Save updates the cell. | **P1** |

---

## Suite 3: Grid Selection & Keyboard Navigation (`03-NAV`)

| Test ID | Test Scenario | Preconditions / Input | Test Steps | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-NAV-01** | `Enter` key on selected idle cell | Cell is selected (not in Edit Mode). | Press `Enter`. | Active cell moves down to the cell below in the same column. | **P0** |
| **TC-NAV-02** | `Shift + Enter` key on selected idle cell | Cell is selected (not in Edit Mode). | Press `Shift + Enter`. | Active cell moves up to the cell above in the same column. | **P1** |
| **TC-NAV-03** | Arrow keys vertical navigation | Any cell is selected. | Press `ArrowDown` or `ArrowUp`. | Selection moves up/down. Reaching row 0 or last row stops gracefully without error. | **P0** |
| **TC-NAV-04** | Arrow keys horizontal navigation | Any cell is selected. | Press `ArrowLeft` or `ArrowRight`. | Selection moves left/right across all columns (Order -> Week -> Attributes -> Evidence -> Result -> Comment). | **P0** |
| **TC-NAV-05** | Mouse range selection (Drag select) | Grid displayed. | Click and hold left mouse button on cell (0,0), drag to (2,2), release. | A 3x3 rectangle of cells is selected with range highlight (`ring-1 ring-blue-300`, `bg-blue-500/20`). | **P0** |
| **TC-NAV-06** | Copy range to clipboard (`Ctrl + C`) | Range of cells selected (e.g. 2 rows x 3 cols). | Press `Ctrl + C`. | TSV-formatted text is copied to clipboard; toast notification displays: *"Successfully copied selected cell range (2x3) to clipboard!"*. | **P0** |
| **TC-NAV-07** | Copy single cell text selection fallback | Inside textarea with partial text highlighted. | Press `Ctrl + C`. | Only the highlighted text substring is copied (native browser behavior); does not copy entire cell range. | **P1** |
| **TC-NAV-08** | Click outside clears selection | Active cell or range selected. | Click outside `<tbody>` on neutral background. | Selection range and active cell border are cleared. | **P2** |

---

## Suite 4: Row Operations (CRUD) (`04-ROW`)

| Test ID | Test Scenario | Preconditions / Input | Test Steps | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-ROW-01** | Add single default row | Table has N rows. | Click `Add Row` button on toolbar. | Row N+1 is appended with next sequential ID, empty attributes, default "Pass" result, and Order index N+1. | **P0** |
| **TC-ROW-02** | Bulk add rows via dialog (`AddRowsDialog`) | Table has N rows. | Open Add Rows dialog, enter count = 10, confirm. | Exactly 10 rows are appended sequentially; `Total Samples` updates accordingly. | **P1** |
| **TC-ROW-03** | Edit row via modal (`EditRowDialog`) | Table has rows. | Click red pencil icon in Week column of Row 1. | Modal dialog opens populated with Row 1's Sample ID, attributes, evidence, result, and comment. Modifying and saving updates the row. | **P0** |
| **TC-ROW-04** | Validation in `EditRowDialog` | EditRowDialog is open. | Clear Sample ID field and submit. | Form submission is blocked; red border appears on Sample ID with validation message *"Sample ID is required"*. | **P1** |
| **TC-ROW-05** | Delete single row | Table has rows. | Click red trash can icon in Week column of Row 2. | Row 2 is removed; subsequent rows are re-indexed immediately (Order numbers remain contiguous: 1, 2, 3...). | **P0** |
| **TC-ROW-06** | Auto-update `Total Samples` on row add/delete | `Total Samples` is not manually overridden. | Add 2 rows, then delete 1 row. | `Total Samples` automatically increments by 2, then decrements by 1; `totalSampleOutput` emits new count. | **P0** |
| **TC-ROW-07** | Auto-update `Total Errors` on Fail row deletion | A row has Result = "Fail". | Delete the row with Result = "Fail". | `Total Errors` count automatically decrements by 1; `totalErrorOutput` reflects the change. | **P0** |

---

## Suite 5: Dynamic Attributes & Column Management (`05-COL`)

| Test ID | Test Scenario | Preconditions / Input | Test Steps | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-COL-01** | Add new dynamic attribute column | Table has M attributes. | Hover column header, click `+` (Add Attribute Column) button. | New column appears immediately to the right of the target column; all existing rows have empty strings for this attribute. | **P0** |
| **TC-COL-02** | Rename dynamic attribute column | Dynamic column exists. | Edit column header title and confirm. | Header updates; emitted JSON reflects updated `ColumnName` in `headers` and `cells`. | **P1** |
| **TC-COL-03** | Delete dynamic attribute column | Dynamic column exists. | Open column header context menu, select Delete Column. | Column is removed; the corresponding attribute key is stripped from all row records. | **P0** |
| **TC-COL-04** | Drag and drop column reordering (`@dnd-kit`) | At least 2 dynamic attribute columns exist. | Drag Header A and drop it past Header B. | Columns swap positions smoothly; visual order and data `order` indices update accurately. | **P1** |
| **TC-COL-05** | Column width resizing | Any resizable column. | Drag the resize handle on the right edge of the column header. | Column width expands/contracts following mouse movement without breaking overall table layout. | **P1** |
| **TC-COL-06** | Maximum attribute column limit check | Table with multiple attributes. | Add multiple columns up to 50+ attributes. | Table enables horizontal scrolling; headers remain aligned with cells; performance remains smooth. | **P2** |

---

## Suite 6: Special Columns: Evidence & Result (`06-SPEC`)

| Test ID | Test Scenario | Preconditions / Input | Test Steps | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-SPEC-01** | Open `EvidenceMultiSelect` dropdown | Evidence column cell. | Click inside Evidence cell. | Multi-select dropdown portal opens positioned below the cell; shows checkboxes for all evidence options. | **P0** |
| **TC-SPEC-02** | Real-time search in Evidence dropdown | Evidence dropdown is open. | Type search keyword into dropdown search input. | Options list filters in real time matching the search query. | **P1** |
| **TC-SPEC-03** | Multi-select files and semicolon serialization | Evidence dropdown is open. | Select "File_A.pdf" and "File_B.png". | Cell displays tags for selected files; underlying data stores semicolon-delimited string: `"File_A.pdf; File_B.png"`. | **P0** |
| **TC-SPEC-04** | Toggle Result from Pass to Fail | Row has Result = "Pass". | Click Result cell, select "Fail" from dropdown. | Cell styling changes to red badge ("Fail"); `totalErrorOutput` increments by 1. | **P0** |
| **TC-SPEC-05** | Toggle Result from Fail to Pass | Row has Result = "Fail". | Click Result cell, select "Pass" from dropdown. | Cell styling changes to green badge ("Pass"); `totalErrorOutput` decrements by 1. | **P0** |
| **TC-SPEC-06** | Evidence options preservation | Row has evidence not in `evidenceFileInputList`. | Render row with custom evidence value. | `mergeEvidenceOptions` merges the existing value into the option list so it is not lost or displayed as blank. | **P1** |
| **TC-SPEC-07** | Keyboard navigation in dropdowns | Result or Evidence dropdown open. | Press `ArrowUp`, `ArrowDown`, `Enter`, or `Escape`. | Options can be highlighted via keyboard; `Escape` closes the dropdown and returns focus to table. | **P2** |

---

## Suite 7: Clipboard Engine & Paste Parser (`07-CLIP`)

| Test ID | Test Scenario | Preconditions / Input | Test Steps | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-CLIP-01** | Direct Excel paste into active cell | Clipboard contains 3 rows x 2 cols copied from Excel. | Select cell (1, 1), click `Paste` button on toolbar. | Cells starting at (1, 1) are populated with pasted values; row and column limits are respected. | **P0** |
| **TC-CLIP-02** | Paste exceeding table boundaries | Clipboard contains 10 rows; active cell is at row 8 of 10. | Click `Paste` button on toolbar. | Paste is rejected; error toast appears: *"Cannot paste because content exceeds the available range."*. | **P0** |
| **TC-CLIP-03** | Auto-strip Order column during paste | Clipboard contains data copied with Row Numbers (e.g. 1, 2, 3 in Col 1). | Paste with active column set to "order". | Parser automatically strips the Order column and maps remaining columns to Week, Attributes, etc. | **P1** |
| **TC-CLIP-04** | Case-insensitive Result value parsing | Clipboard has "pass", "FAIL", "Fail", "PASS". | Paste into Result column. | Values are normalized to canonical `"Pass"` or `"Fail"`; `totalErrorOutput` updates accurately. | **P1** |
| **TC-CLIP-05** | Paste when no cell is selected | Clipboard contains tabular TSV data; no active cell. | Click `Paste` button. | Opens `CopyAndPasteDialog` allowing user to specify target row range or append as new rows. | **P1** |
| **TC-CLIP-06** | Advanced Paste Dialog (`CopyAndPasteDialog`) | Valid data in clipboard. | Click `Copy & Paste` toolbar button. | Dialog displays preview table, source vs target column mapping dropdowns, and from/to row selectors. | **P1** |
| **TC-CLIP-07** | Invalid / Empty clipboard paste | Clipboard is empty or contains non-tabular text. | Click `Paste`. | Handled gracefully without error; warning toast shown if clipboard is empty. | **P2** |
| **TC-CLIP-08** | Multiline text cell paste | Single cell on clipboard contains text with embedded newlines. | Paste into a single comment cell. | Single cell absorbs the multiline text; does not accidentally split across multiple rows. | **P1** |

---

## Suite 8: Toolbar & Bulk Operations (`08-TOOL`)

| Test ID | Test Scenario | Preconditions / Input | Test Steps | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-TOOL-01** | Toggle `Selection Mode` | Table displayed with rows. | Click `Selection Mode` button on toolbar. | Selection Mode toggles ON; row checkbox column appears; toolbar reveals batch action buttons. | **P0** |
| **TC-TOOL-02** | Select All rows checkbox | Selection Mode is ON. | Check the header checkbox in column 0. | All row checkboxes are checked simultaneously; button states update. | **P0** |
| **TC-TOOL-03** | Partial row selection (Indeterminate state) | Selection Mode is ON with 10 rows. | Check 3 out of 10 rows. | Header checkbox displays indeterminate state; toolbar shows count of selected items. | **P1** |
| **TC-TOOL-04** | `Copy Selection` button | 3 rows are selected. | Click `Copy Selection` button. | Data from the 3 selected rows is exported to TSV and written to clipboard; success toast displays. | **P0** |
| **TC-TOOL-05** | `Copy All` button | Any table state with rows. | Click `Copy All` button on toolbar. | All table rows are exported to TSV on clipboard regardless of selection. | **P0** |
| **TC-TOOL-06** | `Delete Table` action button | Toolbar displayed. | Click `Delete Action` button. | `OnDelete` event is dispatched to Power Apps (`this.context.events.OnDelete()`). | **P0** |

---

## Suite 9: Table Header & Totals Override (`09-HEAD`)

| Test ID | Test Scenario | Preconditions / Input | Test Steps | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-HEAD-01** | Select Table Name from dropdown | Multiple tables in `tableNameOptions`. | Click Table Name dropdown in header, select Table B. | Table title updates; `tableNameOutput` emits new table name; `onTableNameChange` fires. | **P0** |
| **TC-HEAD-02** | Manual override of `Total Samples` | Table has 10 rows (default Total Samples = 10). | Click Total Samples input, type `50`. | Total Samples updates to 50; `totalSampleOutput` emits 50; adding/deleting rows does not reset manual override. | **P0** |
| **TC-HEAD-03** | Manual override of `Total Errors` | Table has 2 Fail rows (default Total Errors = 2). | Click Total Errors input, type `0`. | Total Errors updates to 0; `totalErrorOutput` emits 0. | **P0** |
| **TC-HEAD-04** | Empty input fallback on blur | Total Samples input is focused. | Clear the input completely (empty string), click outside (blur). | Input automatically defaults back to `"0"`; does not crash with `NaN`. | **P1** |
| **TC-HEAD-05** | Select-on-focus behavior | Header inputs displayed. | Click or focus into Total Samples or Total Errors input. | Existing text/number is automatically highlighted/selected (`e.target.select()`) for quick overwriting. | **P2** |
| **TC-HEAD-06** | Stop click propagation on header inputs | Accordion is open. | Click into Total Samples input. | Focus is placed into input; accordion does **not** collapse (`e.stopPropagation()` works). | **P1** |

---

## Suite 10: Layout, Accordion & Responsive Design (`10-UI`)

| Test ID | Test Scenario | Preconditions / Input | Test Steps | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-UI-01** | Accordion Expand / Collapse | Table mounted. | Click the Accordion summary bar. | Table collapses / expands smoothly; chevron icon rotates between 0° and -90°. | **P1** |
| **TC-UI-02** | Sticky Table Header | Table has 100+ rows. | Scroll down vertically. | Table header remains anchored at top (`sticky top-0`, `z-index: 10`); content scrolls beneath cleanly. | **P0** |
| **TC-UI-03** | Sticky Left Order Column | Table has 15+ dynamic columns. | Scroll horizontally to the right. | Column 0 (Row number & checkbox) remains frozen on the left edge. | **P1** |
| **TC-UI-04** | `maxHeight` boundary compliance | `maxHeight = 600` passed from Power Apps. | Fill table with large number of rows. | Component calculates `tableMaxHeight = maxHeight - 120`; vertical scrollbar appears inside grid; does not overflow container. | **P0** |
| **TC-UI-05** | Dynamic height reporting (`heightOutput`) | Table expanded vs collapsed. | Toggle accordion or resize table. | Component measures rendered height and emits rounded integer via `heightOutput`. | **P1** |
| **TC-UI-06** | Font family injection | `font = "Segoe UI"` or `"Roboto"` passed from Power Apps. | Inspect table container styling. | Component applies `fontFamily: font` across all inner components and dialogs. | **P2** |

---

## Suite 11: Disabled / Read-Only Mode (`11-DIS`)

| Test ID | Test Scenario | Preconditions / Input | Test Steps | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-DIS-01** | Double-click blocked in Disabled Mode | Control parameter `isControlDisabled = true`. | Double-click any cell in the table. | **Edit Mode does not open**; textarea is not rendered; no text caret appears. | **P0** |
| **TC-DIS-02** | `F2` key blocked in Disabled Mode | Control is disabled. | Select cell and press `F2`. | Edit Mode does not open. | **P0** |
| **TC-DIS-03** | View Row Details dialog in Disabled Mode | Control is disabled. | Click icon in Week column (changed from red pencil to eye/View icon). | Dialog opens in Read-Only mode; all fields are disabled; **Save button is hidden**, only Close button is visible. | **P0** |
| **TC-DIS-04** | Row delete icon hidden | Control is disabled. | Inspect Week column. | Red trash can (Delete Row) icon is completely hidden; row deletion is impossible. | **P0** |
| **TC-DIS-05** | Toolbar mutation buttons locked | Control is disabled. | Inspect Table Toolbar. | Buttons `Add Row`, `Paste`, `Copy & Paste`, and `Delete Table` are disabled / hidden. | **P0** |
| **TC-DIS-06** | Dropdowns locked in Disabled Mode | Control is disabled. | Click Evidence or Result cells. | Dropdowns do not open; static badge values ("Pass", "Fail", file tags) remain visible. | **P0** |
| **TC-DIS-07** | Column management locked | Control is disabled. | Hover over column headers or attempt to drag. | `+` Add Column button is hidden; Drag and drop reordering is disabled. | **P1** |
| **TC-DIS-08** | Read-only copy and selection allowed | Control is disabled. | Click cell, drag range, press `Ctrl + C`, click `Copy All`. | Range selection and clipboard copy continue to work seamlessly (identical to Excel Protected View). | **P0** |

---

## Test Execution Tracking Checklist

```markdown
- [ ] Suite 01: Initialization & PCF Lifecycle (9/9)
- [ ] Suite 02: Excel-Like Cell Editing (14/14)
- [ ] Suite 03: Grid Selection & Keyboard Navigation (8/8)
- [ ] Suite 04: Row Operations (CRUD) (7/7)
- [ ] Suite 05: Dynamic Attributes & Column Management (6/6)
- [ ] Suite 06: Special Columns: Evidence & Result (7/7)
- [ ] Suite 07: Clipboard Engine & Paste Parser (8/8)
- [ ] Suite 08: Toolbar & Bulk Operations (6/6)
- [ ] Suite 09: Table Header & Totals Override (6/6)
- [ ] Suite 10: Layout, Accordion & Responsive Design (6/6)
- [ ] Suite 11: Disabled / Read-Only Mode (8/8)
```
