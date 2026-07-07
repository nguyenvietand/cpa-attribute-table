/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    font: ComponentFramework.PropertyTypes.StringProperty;
    maxHeight: ComponentFramework.PropertyTypes.WholeNumberProperty;
    dataJSON: ComponentFramework.PropertyTypes.StringProperty;
    defaultTableName: ComponentFramework.PropertyTypes.StringProperty;
    dataJSONOutput: ComponentFramework.PropertyTypes.StringProperty;
    tableNameInputList: ComponentFramework.PropertyTypes.DataSet;
    evidenceFileInputList: ComponentFramework.PropertyTypes.DataSet;
}
export interface IOutputs {
    dataJSONOutput?: string;
    tableNameOutput?: string;
    totalSampleOutput?: number;
    totalErrorOutput?: number;
    heightOutput?: number;
}
