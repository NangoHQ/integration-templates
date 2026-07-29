import { z } from 'zod';
import { createAction } from 'nango';

const DataTypeSchema = z.enum(['string', 'Int64', 'double', 'bool', 'DateTime']);

const ColumnSchema = z.object({
    name: z.string().describe('Column name. Example: "SalesAmount"'),
    dataType: DataTypeSchema.describe('Column data type. Example: "string"')
});

const InputSchema = z.object({
    groupId: z.string().describe('Workspace (group) ID. Example: "149ca924-4333-471b-94b5-347eca3f9938"'),
    datasetId: z.string().describe('Dataset ID. Example: "a71c1b98-a0db-4423-a81b-5dcb48d5c8d1"'),
    tableName: z.string().describe('Table name. Example: "SalesFact"'),
    columns: z.array(ColumnSchema).describe('New column schema for the table')
});

const ProviderColumnSchema = z.object({
    name: z.string(),
    dataType: DataTypeSchema
});

const ProviderTableSchema = z.object({
    name: z.string(),
    columns: z.array(ProviderColumnSchema).optional()
});

const OutputSchema = z.object({
    name: z.string().describe('Table name'),
    columns: z.array(ColumnSchema).describe('Updated column schema')
});

const action = createAction({
    description: "Replace a push dataset table's column schema.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Dataset.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/rest/api/power-bi/push-datasets/tables/update-table
        const response = await nango.put({
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.groupId)}/datasets/${encodeURIComponent(input.datasetId)}/tables/${encodeURIComponent(input.tableName)}`,
            data: {
                name: input.tableName,
                columns: input.columns
            },
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Workspace, dataset, or table not found.',
                groupId: input.groupId,
                datasetId: input.datasetId,
                tableName: input.tableName
            });
        }

        const providerTable = ProviderTableSchema.safeParse(response.data);

        if (!providerTable.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Power BI API while updating table schema.',
                groupId: input.groupId,
                datasetId: input.datasetId,
                tableName: input.tableName
            });
        }

        return {
            name: providerTable.data.name,
            columns: providerTable.data.columns ?? input.columns
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
