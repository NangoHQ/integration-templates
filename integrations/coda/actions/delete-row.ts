import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('The ID of the document containing the table. Example: "L_hgEASd6n"'),
    tableIdOrName: z.string().describe('The ID or name of the table containing the row. Example: "grid-123"'),
    rowIdOrName: z.string().describe('The ID or name of the row to delete. Example: "i-123"')
});

const ProviderResponseSchema = z.object({
    requestId: z.string().describe('The async request ID for tracking the mutation status.')
});

const OutputSchema = z.object({
    requestId: z.string().describe('The async request ID for tracking the mutation status.')
});

const action = createAction({
    description: 'Delete a single row from a Coda table.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        method: 'POST',
        path: '/actions/delete-row'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://coda.io/developers/apis/v1#tag/Rows/operation/deleteRow
            endpoint: `/docs/${encodeURIComponent(input.docId)}/tables/${encodeURIComponent(input.tableIdOrName)}/rows/${encodeURIComponent(input.rowIdOrName)}`,
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
