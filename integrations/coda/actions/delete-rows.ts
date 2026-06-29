import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('The ID of the doc containing the table. Example: "AbCDeFGH"'),
    tableIdOrName: z.string().describe('The ID or name of the table to delete rows from. Example: "grid-tE68GY5gIp"'),
    rowIds: z.array(z.string()).min(1).max(100).describe('The IDs of the rows to delete. Up to 100 row IDs per call.')
});

const ProviderResponseSchema = z.object({
    requestId: z.string().describe('The mutation request ID for tracking async completion.')
});

const OutputSchema = z.object({
    requestId: z.string().describe('The mutation request ID for tracking async completion.')
});

const action = createAction({
    description: 'Delete multiple rows in a single request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://coda.io/developers/apis/v1
            endpoint: `/docs/${encodeURIComponent(input.docId)}/tables/${encodeURIComponent(input.tableIdOrName)}/rows`,
            data: {
                rowIds: input.rowIds
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            requestId: providerResponse.requestId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
