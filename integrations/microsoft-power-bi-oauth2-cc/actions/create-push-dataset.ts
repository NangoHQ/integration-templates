import { z } from 'zod';
import { createAction } from 'nango';

const DataTypeSchema = z.enum(['string', 'Int64', 'double', 'bool', 'DateTime']);

const ColumnSchema = z.object({
    name: z.string().describe('Column name. Example: "ProductName"'),
    dataType: DataTypeSchema.describe('Column data type. Example: "string"')
});

const TableSchema = z.object({
    name: z.string().describe('Table name. Example: "SalesFact"'),
    columns: z.array(ColumnSchema).describe('Column schema for this table')
});

const InputSchema = z.object({
    groupId: z.string().describe('Workspace ID. Example: "149ca924-4333-471b-94b5-347eca3f9938"'),
    name: z.string().describe('Dataset name. Example: "Registry Test Dataset"'),
    tables: z.array(TableSchema).describe('Dataset tables with column schema')
});

const ProviderDatasetSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        defaultMode: z.string().optional(),
        defaultRetentionPolicy: z.string().optional(),
        addRowsAPIEnabled: z.boolean().optional(),
        configuredBy: z.string().optional(),
        createdDate: z.string().optional(),
        tables: z.array(z.unknown()).optional(),
        datasources: z.array(z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    defaultMode: z.string().optional(),
    defaultRetentionPolicy: z.string().optional(),
    addRowsAPIEnabled: z.boolean().optional(),
    configuredBy: z.string().optional(),
    createdDate: z.string().optional(),
    tables: z.array(z.unknown()).optional(),
    datasources: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Create a new dataset with an explicit table/column schema in push mode, ready to receive rows via the API without needing a .pbix file.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Dataset.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/rest/api/power-bi/push-datasets/datasets-post-dataset-in-group
        const response = await nango.post({
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.groupId)}/datasets`,
            data: {
                name: input.name,
                defaultMode: 'Push',
                tables: input.tables
            },
            retries: 3
        });

        const providerDataset = ProviderDatasetSchema.parse(response.data);

        return {
            id: providerDataset.id,
            name: providerDataset.name,
            ...(providerDataset.defaultMode !== undefined && { defaultMode: providerDataset.defaultMode }),
            ...(providerDataset.defaultRetentionPolicy !== undefined && { defaultRetentionPolicy: providerDataset.defaultRetentionPolicy }),
            ...(providerDataset.addRowsAPIEnabled !== undefined && { addRowsAPIEnabled: providerDataset.addRowsAPIEnabled }),
            ...(providerDataset.configuredBy !== undefined && { configuredBy: providerDataset.configuredBy }),
            ...(providerDataset.createdDate !== undefined && { createdDate: providerDataset.createdDate }),
            ...(providerDataset.tables !== undefined && { tables: providerDataset.tables }),
            ...(providerDataset.datasources !== undefined && { datasources: providerDataset.datasources })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
