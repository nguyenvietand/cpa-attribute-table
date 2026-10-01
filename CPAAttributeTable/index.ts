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
    private harnessDisabled = false;

    private handleKeyDown = (e: KeyboardEvent) => {
        // Toggle Disabled Mode on Ctrl + Shift + D (or Ctrl + Alt + D)
        if (e.ctrlKey && (e.shiftKey || e.altKey) && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            this.harnessDisabled = !this.harnessDisabled;
            console.log(`%c[TEST HARNESS] Toggled Disabled Mode: ${this.harnessDisabled}`, 'color: #2563eb; font-weight: bold;');
            this.render();
        }
    };

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

        // Check if running on localhost / test harness
        const isLocalhost = typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' ||
             window.location.hostname === '127.0.0.1' ||
             window.location.port === '8181');

        if (isLocalhost) {
            // Also support ?disabled=true on URL
            const urlDisabled = new URLSearchParams(window.location.search).get('disabled');
            if (urlDisabled === 'true') {
                this.harnessDisabled = true;
            }
            window.addEventListener('keydown', this.handleKeyDown);

            // Expose console helpers on window for effortless harness testing
            (window as any).setDisabled = (val?: boolean) => {
                this.harnessDisabled = typeof val === 'boolean' ? val : !this.harnessDisabled;
                console.log(`%c[TEST HARNESS] Disabled Mode set to: ${this.harnessDisabled}`, 'color: #2563eb; font-weight: bold;');
                this.render();
            };
            (window as any).toggleDisabled = () => (window as any).setDisabled();

            console.log('%c[TEST HARNESS] Press Ctrl + Shift + D or type setDisabled(true/false) in console to toggle Disabled / Read-Only mode', 'color: #16a34a; font-weight: bold;');
        }

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
        if (typeof window !== 'undefined') {
            window.removeEventListener('keydown', this.handleKeyDown);
            delete (window as any).setDisabled;
            delete (window as any).toggleDisabled;
        }
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

        const isControlDisabled = Boolean(
            this.context.mode.isControlDisabled ||
            this.harnessDisabled
        );

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
                disabled: isControlDisabled,
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
