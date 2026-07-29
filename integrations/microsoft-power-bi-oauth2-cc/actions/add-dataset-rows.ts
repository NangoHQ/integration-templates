import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Workspace ID. Example: "149ca924-4333-471b-94b5-347eca3f9938"'),
    datasetId: z.string().describe('Dataset ID. Example: "a71c1b98-a0db-4423-a81b-5dcb48d5c8d1"'),
    tableName: z.string().describe('Table name. Example: "SalesFact"'),
    rows: z
        .array(z.record(z.string(), z.unknown()))
        .min(1)
        .max(10000)
        .describe('Rows to append (max 10,000 per call, per Power BI push-dataset limits). Each row is an object mapping column names to values.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Append rows of data to a push-dataset table.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Dataset.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/rest/api/power-bi/push-datasets/datasets-post-rows
        // No retries: a transient failure may still have committed the append on Power BI's
        // side, and this endpoint has no idempotency key, so retrying risks duplicate rows.
        await nango.post({
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.groupId)}/datasets/${encodeURIComponent(input.datasetId)}/tables/${encodeURIComponent(input.tableName)}/rows`,
            data: {
                rows: input.rows
            },
            retries: 0
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
