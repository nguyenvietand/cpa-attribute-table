import React, { useRef, useEffect } from 'react';
import SampleTable from './AdditionalSampleTable';
import { Attribute, SampleRow } from './AdditionalSampleTable/mockData';

interface CPAAttributeTableAppProps {
    width: number;
    height: number;
    font: string;
    maxHeight?: number;
    dataJSONString: string;
    defaultTableName: string;
    tableNameOptions: string[];
    evidenceFileOptions: string[];
    onDataChange?: (jsonValue: string) => void;
    onDeleteAction?: () => void;
    onTotalSampleChange?: (total: number) => void;
    onTotalErrorChange?: (errors: number) => void;
    onTableNameChange?: (name: string) => void;
    onHeightChange?: (height: number) => void;
}

interface DataCell {
    ColumnName: string;
    Id: number;
    Order: number;
    Value: string;
    WP_ID: number | null;
}

interface DataHeader {
    ColumnName: string;
    Order: number;
}

interface DataRow {
    Id: number;
}

interface InputDataJSON {
    cells?: DataCell[];
    headers?: DataHeader[];
    rows?: DataRow[];
}

interface TableSnapshot {
    rows: SampleRow[];
    attributes: Attribute[];
    columnHeaders: {
        week: string;
        evidence: string;
        result: string;
        comment: string;
    };
}

const EVIDENCE_COLUMN_NAME = 'Supporting Evidence per Attribute';
const RESULT_COLUMN_NAME = 'Control Sample Assessment Result (Pass/Fail)';
const SAMPLE_ID_COLUMN_NAME = 'Sample ID';
const COMMENT_COLUMN_NAME = 'Comment';

function normalizeResult(value: string | undefined): 'Pass' | 'Fail' | '' {
    const normalized = (value ?? '').trim();
    if (/^pass$/i.test(normalized)) return 'Pass';
    if (/^fail$/i.test(normalized)) return 'Fail';
    return '';
}

function normalizeHeaderColumnName(value: string | undefined): string {
    return (value ?? '').trim();
}

function splitEvidenceFiles(value: string | undefined): string[] {
    if (!value) return [];
    return value
        .split(';')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
}

function buildInitialState(dataJSONString: string): {
    rows: SampleRow[];
    attributes: Attribute[];
    columnHeaders: { week: string; evidence: string; result: string; comment: string };
    rowWpIds: Record<number, number | null>;
} {
    const emptyState = {
        rows: [] as SampleRow[],
        attributes: [] as Attribute[],
        columnHeaders: {
            week: SAMPLE_ID_COLUMN_NAME,
            evidence: EVIDENCE_COLUMN_NAME,
            result: RESULT_COLUMN_NAME,
            comment: COMMENT_COLUMN_NAME,
        },
        rowWpIds: {} as Record<number, number | null>,
    };

    if (!dataJSONString.trim()) {
        return emptyState;
    }

    let parsed: InputDataJSON;
    try {
        parsed = JSON.parse(dataJSONString) as InputDataJSON;
    } catch (error) {
        return emptyState;
    }

    const cells = Array.isArray(parsed.cells) ? parsed.cells : [];
    const providedHeaders = Array.isArray(parsed.headers) ? parsed.headers : [];
    const headersSource: DataHeader[] =
        providedHeaders.length > 0
            ? providedHeaders
            : Array.from(
                  new Map(
                      cells
                          .filter((cell) => Number.isFinite(cell.Order))
                          .map((cell) => [cell.Order, { ColumnName: cell.ColumnName, Order: cell.Order }]),
                  ).values(),
              );

    const normalizedHeaders = headersSource
        .map((header) => ({
            ColumnName: normalizeHeaderColumnName(header.ColumnName),
            Order: Number(header.Order),
        }))
        .filter((header) => header.ColumnName && Number.isFinite(header.Order))
        .sort((a, b) => a.Order - b.Order);

    const weekHeader = normalizedHeaders.find((header) => header.Order === 1 || header.ColumnName === SAMPLE_ID_COLUMN_NAME);
    const evidenceHeader =
        normalizedHeaders.find((header) => header.Order === 1001) ||
        normalizedHeaders.find((header) => header.ColumnName === EVIDENCE_COLUMN_NAME);
    const resultHeader =
        normalizedHeaders.find((header) => header.Order === 1002) ||
        normalizedHeaders.find((header) => header.ColumnName === RESULT_COLUMN_NAME);
    const commentHeader =
        normalizedHeaders.find((header) => header.Order === 1003) ||
        normalizedHeaders.find((header) => header.ColumnName === COMMENT_COLUMN_NAME);

    const dynamicHeaders = normalizedHeaders
        .filter((header) => header.Order > 1 && header.Order < 1001)
        .filter(
            (header) =>
                header.ColumnName !== SAMPLE_ID_COLUMN_NAME &&
                header.ColumnName !== EVIDENCE_COLUMN_NAME &&
                header.ColumnName !== RESULT_COLUMN_NAME,
        );

    const attributes: Attribute[] = dynamicHeaders.map((header, index) => ({
        id: `attr_${header.Order}_${index}`,
        name: `Attribute ${index + 1}`,
        columnName: header.ColumnName,
        description: header.ColumnName,
        order: index + 2,
    }));

    const cellsById = new Map<number, DataCell[]>();
    cells.forEach((cell) => {
        const rowId = Number(cell.Id);
        if (!Number.isFinite(rowId)) return;
        const existing = cellsById.get(rowId);
        if (existing) {
            existing.push(cell);
        } else {
            cellsById.set(rowId, [cell]);
        }
    });

    const sourceRows = Array.isArray(parsed.rows) ? parsed.rows : [];
    const rowOrderIds = sourceRows
        .map((row) => Number(row.Id))
        .filter((rowId) => Number.isFinite(rowId));

    const rowIds = rowOrderIds.length > 0 ? rowOrderIds : Array.from(cellsById.keys()).sort((a, b) => a - b);

    const rows: SampleRow[] = rowIds.map((rowId) => {
        const rowCells = cellsById.get(rowId) ?? [];
        const cellByOrder = new Map<number, DataCell>();
        const cellByName = new Map<string, DataCell>();

        rowCells.forEach((cell) => {
            if (Number.isFinite(cell.Order) && !cellByOrder.has(cell.Order)) {
                cellByOrder.set(cell.Order, cell);
            }
            const normalizedName = normalizeHeaderColumnName(cell.ColumnName);
            if (normalizedName && !cellByName.has(normalizedName)) {
                cellByName.set(normalizedName, cell);
            }
        });

        const attributeValues: Record<string, string> = {};
        attributes.forEach((attribute) => {
            const attrCell = cellByOrder.get(attribute.order) ?? cellByName.get(attribute.columnName);
            attributeValues[attribute.id] = attrCell?.Value ?? '';
        });

        const weekCell =
            cellByOrder.get(1) ??
            (weekHeader ? cellByName.get(weekHeader.ColumnName) : undefined) ??
            cellByName.get(SAMPLE_ID_COLUMN_NAME);
        const evidenceCell =
            cellByOrder.get(1001) ??
            (evidenceHeader ? cellByName.get(evidenceHeader.ColumnName) : undefined) ??
            cellByName.get(EVIDENCE_COLUMN_NAME);
        const resultCell =
            cellByOrder.get(1002) ??
            (resultHeader ? cellByName.get(resultHeader.ColumnName) : undefined) ??
            cellByName.get(RESULT_COLUMN_NAME);
        const commentCell =
            cellByOrder.get(1003) ??
            (commentHeader ? cellByName.get(commentHeader.ColumnName) : undefined) ??
            cellByName.get(COMMENT_COLUMN_NAME);

        const evidenceFiles = splitEvidenceFiles(evidenceCell?.Value);

        return {
            id: rowId,
            week: weekCell?.Value ?? '',
            attributes: attributeValues,
            evidence: evidenceFiles.join(';'),
            result: normalizeResult(resultCell?.Value),
            comment: commentCell?.Value ?? '',
        };
    });

    const rowWpIds: Record<number, number | null> = {};
    rowIds.forEach((rowId) => {
        const rowCells = cellsById.get(rowId) ?? [];
        const wpSource = rowCells.find((cell) => cell.WP_ID !== undefined);
        rowWpIds[rowId] = wpSource?.WP_ID ?? null;
    });

    return {
        rows,
        attributes,
        columnHeaders: {
            week: weekHeader?.ColumnName || SAMPLE_ID_COLUMN_NAME,
            evidence: evidenceHeader?.ColumnName || EVIDENCE_COLUMN_NAME,
            result: resultHeader?.ColumnName || RESULT_COLUMN_NAME,
            comment: commentHeader?.ColumnName || COMMENT_COLUMN_NAME,
        },
        rowWpIds,
    };
}

function resolveEvidenceOptions(evidenceFileOptions: string[]): string[] {
    return evidenceFileOptions;
}

function serializeOutputDataJSON(snapshot: TableSnapshot, rowWpIds: Record<number, number | null>): string {
    const dynamicHeaders = [...snapshot.attributes].sort((a, b) => a.order - b.order);

    const headers: DataHeader[] = [
        { ColumnName: snapshot.columnHeaders.week || SAMPLE_ID_COLUMN_NAME, Order: 1 },
        ...dynamicHeaders.map((attr) => ({
            ColumnName: (attr.description || attr.columnName || attr.name || '').trim() || attr.name,
            Order: attr.order,
        })),
        { ColumnName: snapshot.columnHeaders.evidence || EVIDENCE_COLUMN_NAME, Order: 1001 },
        { ColumnName: snapshot.columnHeaders.result || RESULT_COLUMN_NAME, Order: 1002 },
        { ColumnName: snapshot.columnHeaders.comment || COMMENT_COLUMN_NAME, Order: 1003 },
    ];

    const cells: DataCell[] = [];
    snapshot.rows.forEach((row) => {
        const wpId = Object.prototype.hasOwnProperty.call(rowWpIds, row.id) ? rowWpIds[row.id] : null;
        cells.push({
            ColumnName: snapshot.columnHeaders.week || SAMPLE_ID_COLUMN_NAME,
            Id: row.id,
            Order: 1,
            Value: row.week ?? '',
            WP_ID: wpId,
        });

        dynamicHeaders.forEach((attr) => {
            cells.push({
                ColumnName: (attr.description || attr.columnName || attr.name || '').trim() || attr.name,
                Id: row.id,
                Order: attr.order,
                Value: row.attributes[attr.id] ?? '',
                WP_ID: wpId,
            });
        });

        cells.push({
            ColumnName: snapshot.columnHeaders.evidence || EVIDENCE_COLUMN_NAME,
            Id: row.id,
            Order: 1001,
            Value: row.evidence ?? '',
            WP_ID: wpId,
        });
        cells.push({
            ColumnName: snapshot.columnHeaders.result || RESULT_COLUMN_NAME,
            Id: row.id,
            Order: 1002,
            Value: row.result ?? '',
            WP_ID: wpId,
        });
        cells.push({
            ColumnName: snapshot.columnHeaders.comment || COMMENT_COLUMN_NAME,
            Id: row.id,
            Order: 1003,
            Value: row.comment ?? '',
            WP_ID: wpId,
        });
    });

    const rows: DataRow[] = snapshot.rows.map((row) => ({ Id: row.id }));
    return JSON.stringify({ cells, headers, rows });
}

export default function CPAAttributeTableApp({
    width,
    height,
    font,
    maxHeight,
    dataJSONString,
    defaultTableName,
    tableNameOptions,
    evidenceFileOptions,
    onDataChange,
    onDeleteAction,
    onTotalSampleChange,
    onTotalErrorChange,
    onTableNameChange,
    onHeightChange,
}: CPAAttributeTableAppProps): React.JSX.Element {
    const tableMaxHeight = Math.max(220, height - 120);
    const parsedState = React.useMemo(() => buildInitialState(dataJSONString), [dataJSONString]);
    const evidenceOptions = React.useMemo(() => resolveEvidenceOptions(evidenceFileOptions), [evidenceFileOptions]);

    React.useEffect(() => {
        if (!parsedState.rows) return;
        const totalSamples = parsedState.rows.length;
        const totalErrors = parsedState.rows.filter((row) => row.result === 'Fail').length;

        onTotalSampleChange?.(totalSamples);
        onTotalErrorChange?.(totalErrors);
    }, [parsedState.rows, onTotalSampleChange, onTotalErrorChange]);

    React.useEffect(() => {
        onTableNameChange?.(defaultTableName);
    }, [defaultTableName, onTableNameChange]);

    const handleTableDataChange = React.useCallback(
        (snapshot: TableSnapshot) => {
            if (!onDataChange) return;
            const jsonValue = serializeOutputDataJSON(snapshot, parsedState.rowWpIds);
            onDataChange(jsonValue);

            const totalSamples = snapshot.rows.length;
            const totalErrors = snapshot.rows.filter((row) => row.result === 'Fail').length;

            onTotalSampleChange?.(totalSamples);
            onTotalErrorChange?.(totalErrors);
        },
        [onDataChange, parsedState.rowWpIds, onTotalSampleChange, onTotalErrorChange],
    );

    return (
        <div
            className='audit-table-skin flex flex-col bg-white'
            style={{ width, height, overflow: 'hidden', fontFamily: font || undefined }}>
            <main className='flex-1 bg-gray-50/50' style={{ minHeight: 0, height: '100%' }}>
                <div className='mx-auto' style={{ height: '100%', boxSizing: 'border-box' }}>
                    <SampleTable
                        initialRows={parsedState.rows}
                        initialAttributes={parsedState.attributes}
                        initialColumnHeaders={parsedState.columnHeaders}
                        initialEvidenceOptions={evidenceOptions}
                        initialTableNames={tableNameOptions}
                        initialSelectedTableName={defaultTableName}
                        onDataChange={handleTableDataChange}
                        onTableNameChange={onTableNameChange}
                        onTotalSampleChange={onTotalSampleChange}
                        onTotalErrorChange={onTotalErrorChange}
                        onHeightChange={onHeightChange}
                        onDeleteAction={onDeleteAction}
                        maxHeight={maxHeight?? tableMaxHeight}
                    />
                </div>
            </main>
        </div>
    );
}