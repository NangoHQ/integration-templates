import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    documentId: z.string(),
    tableStartIndex: z.number().int().nonnegative(),
    rowIndex: z.number().int().nonnegative(),
    columnIndex: z.number().int().nonnegative(),
    tabId: z.string().optional(),
    segmentId: z.string().optional()
});

const BatchUpdateResponseSchema = z.object({
    documentId: z.string().optional(),
    replies: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    documentId: z.string().optional(),
    replies: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Delete a table row using a reference cell.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-table-row',
        group: 'Tables'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['documents'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tableStartLocation: Record<string, unknown> = {
            index: input.tableStartIndex,
            segmentId: input.segmentId ?? ''
        };
        if (input.tabId !== undefined) {
            tableStartLocation['tabId'] = input.tabId;
        }

        const requestBody = {
            requests: [
                {
                    deleteTableRow: {
                        tableCellLocation: {
                            tableStartLocation,
                            rowIndex: input.rowIndex,
                            columnIndex: input.columnIndex
                        }
                    }
                }
            ]
        };

        const response = await nango.post({
            // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
            endpoint: `/v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
            data: requestBody,
            retries: 3
        });

        const providerResponse = BatchUpdateResponseSchema.parse(response.data);

        return {
            documentId: providerResponse.documentId,
            replies: providerResponse.replies
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
