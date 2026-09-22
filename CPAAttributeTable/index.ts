import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import CPAAttributeTableApp from './CPAAttributeTableApp';

export class CPAAttributeTableControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private root: Root | null = null;
    private context: ComponentFramework.Context<IInputs> | null = null;
    private notifyOutputChanged: (() => void) | null = null;
    private dataJSONOutput = '';
    private tableNameOutput = '';
    private totalSampleOutput = 0;
    private totalErrorOutput = 0;
    private heightOutput = 0;
    private pendingPageLoad: Record<string, boolean> = {};

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        _state: ComponentFramework.Dictionary,
        container: HTMLDivElement,
    ): void {
        context.mode.trackContainerResize(true);
        this.context = context;
        this.notifyOutputChanged = notifyOutputChanged;
        this.root = createRoot(container);
        this.render();
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this.context = context;
        this.render();
    }

    public getOutputs(): IOutputs {
        return {
            dataJSONOutput: this.dataJSONOutput,
            tableNameOutput: this.tableNameOutput,
            totalSampleOutput: this.totalSampleOutput,
            totalErrorOutput: this.totalErrorOutput,
            heightOutput: Math.round(Number(this.heightOutput)) || 0,
        };
    }

    public destroy(): void {
        this.root?.unmount();
        this.root = null;
        this.notifyOutputChanged = null;
        this.pendingPageLoad = {};
    }

    private requestNextPageIfNeeded(dataset: ComponentFramework.PropertyTypes.DataSet | undefined, key: string): void {
        const paging = dataset?.paging as { hasNextPage?: boolean; loadNextPage?: () => void; setPageSize?: (size: number) => void } | undefined;
        if (!dataset || !paging) return;

        // Ask for larger page chunks so large datasets finish loading faster.
        if (!this.pendingPageLoad[`${key}:pageSize`]) {
            this.pendingPageLoad[`${key}:pageSize`] = true;
            paging.setPageSize?.(5000);
        }

        if (dataset.loading) return;
        if (!paging.hasNextPage) {
            this.pendingPageLoad[key] = false;
            return;
        }
        if (this.pendingPageLoad[key]) return;

        this.pendingPageLoad[key] = true;
        paging.loadNextPage?.();
    }

    private handleDeleteAction = () => {
        const currentContext = this.context as any;
        if (currentContext && currentContext.events) {
            currentContext.events.OnDelete();
        }
    };

    private handleDataChange = (nextOutputJson: string) => {
        if (nextOutputJson === this.dataJSONOutput) return;
        this.dataJSONOutput = nextOutputJson;
        this.notifyOutputChanged?.();
    };

    private handleTableNameChange = (nextTableName: string) => {
        if (nextTableName === this.tableNameOutput) return;
        this.tableNameOutput = nextTableName;
        this.notifyOutputChanged?.();
    };

    private handleTotalSampleChange = (nextTotalSample: number | string) => {
        const val = Number(nextTotalSample);
        if (val === this.totalSampleOutput) return;
        this.totalSampleOutput = val;
        this.notifyOutputChanged?.();
    };

    private handleTotalErrorChange = (nextTotalError: number | string) => {
        const val = Number(nextTotalError);
        if (val === this.totalErrorOutput) return;
        this.totalErrorOutput = val;
        this.notifyOutputChanged?.();
    };

    private handleHeightChange = (newHeight: number) => {
        if (Math.round(newHeight) === this.heightOutput) return;

        this.heightOutput = Math.round(newHeight);

        this.notifyOutputChanged?.();
    };

    private render(): void {
        if (!this.root || !this.context) return;

        const tableNameDataset = this.context.parameters.tableNameInputList;
        const evidenceFileDataset = this.context.parameters.evidenceFileInputList;

        // In Power Apps runtime, DataSet is paged and only first chunk (25 items) is available initially.
        // Keep requesting next pages so sortedRecordIds can contain the full result set.
        this.requestNextPageIfNeeded(tableNameDataset, 'tableNameInputList');
        this.requestNextPageIfNeeded(evidenceFileDataset, 'evidenceFileInputList');

        if (!tableNameDataset?.loading) this.pendingPageLoad.tableNameInputList = false;
        if (!evidenceFileDataset?.loading) this.pendingPageLoad.evidenceFileInputList = false;

        const allocatedWidth = Number(this.context.mode.allocatedWidth);
        const allocatedHeight = Number(this.context.mode.allocatedHeight);
        const font = this.context.parameters.font.raw?.trim() ?? '';
        const maxHeight = (this.context.parameters.maxHeight.raw ?? 715) - 120;
        const dataJSONString = this.context.parameters.dataJSON.raw ?? '';
        const defaultTableName = this.context.parameters.defaultTableName.raw ?? '';
        const tableNameOptions = this.getDatasetValues(tableNameDataset, 'Value');
        const evidenceFileOptions = this.getDatasetValues(evidenceFileDataset, 'Title');

        const width = Number.isFinite(allocatedWidth) && allocatedWidth > 0 ? allocatedWidth : 1200;
        const height = Number.isFinite(allocatedHeight) && allocatedHeight > 0 ? allocatedHeight : 700;

        this.root.render(
            React.createElement(CPAAttributeTableApp, {
                width,
                height,
                font,
                maxHeight,
                dataJSONString,
                defaultTableName,
                tableNameOptions,
                evidenceFileOptions,
                onDeleteAction: this.handleDeleteAction,
                onDataChange: this.handleDataChange,
                onTableNameChange: this.handleTableNameChange,
                onTotalSampleChange: this.handleTotalSampleChange,
                onTotalErrorChange: this.handleTotalErrorChange,
                onHeightChange: this.handleHeightChange,
            }),
        );
    }

    private getDatasetValues(dataset: ComponentFramework.PropertyTypes.DataSet, fieldName: string): string[] {
        if (!dataset?.records || !Array.isArray(dataset.sortedRecordIds)) {
            return [];
        }

        const values: string[] = [];
        const seen = new Set<string>();
        const normalizedFieldName = fieldName.trim().toLowerCase();
        const headerArtifacts = new Set<string>([
            normalizedFieldName,
            normalizedFieldName.slice(0, 3),
            'value',
            'title',
            'val',
        ]);

        dataset.sortedRecordIds.forEach((recordId) => {
            const record = dataset.records[recordId];
            const rawValue = record?.getValue(fieldName);
            if (typeof rawValue === 'string') {
                const value = rawValue.trim();
                const normalized = value.toLowerCase();
                if (value.length === 0) return;
                if (headerArtifacts.has(normalized)) return;
                if (seen.has(value)) return;
                seen.add(value);
                values.push(value);
            }
        });

        return values;
    }
}
