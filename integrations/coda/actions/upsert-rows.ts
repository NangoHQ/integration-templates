import { z } from 'zod';
import { createAction } from 'nango';

const CellSchema = z.object({
    column: z.string().describe('Column ID or name. Example: "c-bCdeFgh"'),
    value: z.unknown().describe('The cell value.')
});

const RowEditSchema = z.object({
    cells: z.array(CellSchema).describe('The cells to set for this row.')
});

const InputSchema = z.object({
    docId: z.string().describe('ID of the doc. Example: "AbCDeFGH"'),
    tableId: z.string().describe('ID or name of the table. Example: "grid-123"'),
    rows: z.array(RowEditSchema).describe('The rows to insert or upsert.'),
    keyColumns: z.array(z.string()).optional().describe('Column IDs or names to use for upsert matching.')
});

const ProviderResponseSchema = z.object({
    requestId: z.string(),
    addedRowIds: z.array(z.string()).optional()
});

const MutationStatusSchema = z.object({
    completed: z.boolean(),
    warning: z.string().optional()
});

const OutputSchema = z.object({
    requestId: z.string().describe('The request ID for tracking the async mutation.'),
    addedRowIds: z.array(z.string()).optional().describe('IDs of newly added rows.'),
    completed: z.boolean().describe('Whether the mutation has completed.'),
    warning: z.string().optional().describe('Warning if the mutation completed with caveats.')
});

const action = createAction({
    description: 'Insert or update rows in a table.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedDocId = encodeURIComponent(input.docId);
        const encodedTableId = encodeURIComponent(input.tableId);

        const postResponse = await nango.post({
            // https://coda.io/developers/apis/v1
            endpoint: `/docs/${encodedDocId}/tables/${encodedTableId}/rows`,
            data: {
                rows: input.rows,
                ...(input.keyColumns !== undefined && { keyColumns: input.keyColumns })
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(postResponse.data);
        const requestId = providerResponse.requestId;

        let completed = false;
        let warning: string | undefined;
        const maxAttempts = 30;
        const intervalMs = 1000;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, intervalMs));

            let statusResponse;
            // @allowTryCatch The Coda mutationStatus endpoint returns 404 for a few seconds before the mutation status is registered.
            try {
                statusResponse = await nango.get({
                    // https://coda.io/developers/apis/v1
                    endpoint: `/mutationStatus/${encodeURIComponent(requestId)}`,
                    params: { _poll: String(attempt) },
                    retries: 3
                });
            } catch (error) {
                if (error !== null && typeof error === 'object' && 'status' in error && typeof error.status === 'number' && error.status === 404) {
                    continue;
                }
                throw error;
            }

            const status = MutationStatusSchema.parse(statusResponse.data);
            completed = status.completed;
            warning = status.warning;

            if (completed) {
                break;
            }
        }

        if (!completed) {
            throw new nango.ActionError({
                type: 'mutation_timeout',
                message: 'The row mutation did not complete within the expected time.',
                requestId: requestId
            });
        }

        return {
            requestId: requestId,
            ...(providerResponse.addedRowIds !== undefined && { addedRowIds: providerResponse.addedRowIds }),
            completed: completed,
            ...(warning !== undefined && { warning: warning })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
