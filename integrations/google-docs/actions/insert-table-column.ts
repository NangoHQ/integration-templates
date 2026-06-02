import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    documentId: z.string().describe('Google Docs document ID. Example: "1Kj3d86Z-Sfd56YP4dImQ-ggMRyP2QZ_BRO33zOO224c"'),
    tableStartLocationIndex: z.number().int().min(0).describe('The index of the table element in the document body. Example: 211'),
    rowIndex: z.number().int().min(0).describe('The zero-based row index of the reference cell. Example: 1'),
    columnIndex: z.number().int().min(0).describe('The zero-based column index of the reference cell. Example: 1'),
    insertRight: z.boolean().optional().describe('Whether to insert the column to the right of the reference cell. Defaults to false (insert to the left).')
});

const BatchUpdateResponseSchema = z.object({
    documentId: z.string(),
    replies: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    documentId: z.string()
});

const action = createAction({
    description: 'Insert a table column to the left or right of a reference cell.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/insert-table-column',
        group: 'Documents'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['documents', 'drive.file'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
        const response = await nango.post({
            endpoint: `/v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        insertTableColumn: {
                            tableCellLocation: {
                                tableStartLocation: {
                                    index: input.tableStartLocationIndex
                                },
                                rowIndex: input.rowIndex,
                                columnIndex: input.columnIndex
                            },
                            insertRight: input.insertRight ?? false
                        }
                    }
                ]
            },
            retries: 3
        });

        const result = BatchUpdateResponseSchema.safeParse(response.data);
        if (!result.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Google Docs API',
                details: result.error.issues
            });
        }

        return {
            documentId: result.data.documentId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
