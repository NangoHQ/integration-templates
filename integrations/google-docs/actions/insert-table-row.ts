import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    documentId: z.string().describe('Google Docs document ID. Example: "abc123"'),
    tableStartLocationIndex: z.number().int().describe('Index of the table element in the body. Example: 211'),
    rowIndex: z.number().int().describe('Row index of the reference cell. Example: 0'),
    columnIndex: z.number().int().describe('Column index of the reference cell. Example: 0'),
    insertBelow: z.boolean().describe('Whether to insert below the reference cell (true) or above (false).'),
    segmentId: z.string().optional().describe('Segment ID for headers or footers. Omit for body.')
});

const ProviderReplySchema = z.object({
    insertTableRow: z.object({}).optional()
});

const ProviderResponseSchema = z.object({
    documentId: z.string(),
    replies: z.array(ProviderReplySchema).optional(),
    revisionId: z.string().optional()
});

const OutputSchema = z.object({
    documentId: z.string(),
    revisionId: z.string().optional()
});

const action = createAction({
    description: 'Insert a table row above or below a reference cell.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/insert-table-row',
        group: 'Documents'
    },
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
                        insertTableRow: {
                            tableCellLocation: {
                                tableStartLocation: {
                                    index: input.tableStartLocationIndex,
                                    ...(input.segmentId !== undefined && { segmentId: input.segmentId })
                                },
                                rowIndex: input.rowIndex,
                                columnIndex: input.columnIndex
                            },
                            insertBelow: input.insertBelow
                        }
                    }
                ]
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            documentId: providerResponse.documentId,
            ...(providerResponse.revisionId !== undefined && { revisionId: providerResponse.revisionId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
