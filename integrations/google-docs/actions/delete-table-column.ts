import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    documentId: z.string().describe('Google Docs document ID. Example: "1Kj3d86Z-Sfd56YP4dImQ-ggMRyP2QZ_BRO33zOO224c"'),
    tableStartLocationIndex: z.number().int().nonnegative().describe('The index of the table element in the document body. Example: 211'),
    rowIndex: z.number().int().nonnegative().describe('The row index of a cell in the column to delete. Example: 0'),
    columnIndex: z.number().int().nonnegative().describe('The column index to delete. Example: 1')
});

const OutputSchema = z.object({
    documentId: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a table column using a reference cell.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['documents'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
            endpoint: `/v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        deleteTableColumn: {
                            tableCellLocation: {
                                tableStartLocation: {
                                    index: input.tableStartLocationIndex
                                },
                                rowIndex: input.rowIndex,
                                columnIndex: input.columnIndex
                            }
                        }
                    }
                ]
            },
            retries: 3
        });

        const BatchUpdateResponseSchema = z.object({
            replies: z.array(z.unknown()).optional(),
            documentId: z.string().optional(),
            revisionId: z.string().optional()
        });

        const batchResponse = BatchUpdateResponseSchema.parse(response.data);

        if (!batchResponse.documentId && !batchResponse.replies) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Google Docs API'
            });
        }

        return {
            documentId: input.documentId,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
