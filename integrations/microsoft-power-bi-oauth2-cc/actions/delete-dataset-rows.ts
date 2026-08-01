import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspaceId: z.string().describe('Workspace ID (group ID). Example: "149ca924-4333-471b-94b5-347eca3f9938"'),
    datasetId: z.string().describe('Dataset ID. Example: "a71c1b98-a0db-4423-a81b-5dcb48d5c8d1"'),
    tableName: z.string().describe('Table name within the dataset. Example: "SalesFact"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    workspaceId: z.string(),
    datasetId: z.string(),
    tableName: z.string()
});

const action = createAction({
    description: 'Delete all rows from a push-dataset table (truncate)',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Dataset.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedWorkspaceId = encodeURIComponent(input.workspaceId);
        const encodedDatasetId = encodeURIComponent(input.datasetId);
        const encodedTableName = encodeURIComponent(input.tableName);

        // https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/delete-rows
        await nango.delete({
            endpoint: `/v1.0/myorg/groups/${encodedWorkspaceId}/datasets/${encodedDatasetId}/tables/${encodedTableName}/rows`,
            retries: 3
        });

        return {
            success: true,
            workspaceId: input.workspaceId,
            datasetId: input.datasetId,
            tableName: input.tableName
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
