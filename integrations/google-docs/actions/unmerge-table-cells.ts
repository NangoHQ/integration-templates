import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    documentId: z.string().describe('Google Docs document ID. Example: "1Kj3d86Z-Sfd56YP4dImQ-ggMRyP2QZ_BRO33zOO224c"'),
    tableRange: z.object({
        tableCellLocation: z.object({
            tableStartLocation: z.object({
                index: z.number().describe('The zero-based index of the table element in the document body.'),
                segmentId: z.string().optional().describe('The ID of the header, footer or footnote. Empty or omitted signifies the document body.'),
                tabId: z.string().optional().describe('The tab that the location is in.')
            }),
            rowIndex: z.number().describe('The zero-based row index of the starting cell.'),
            columnIndex: z.number().describe('The zero-based column index of the starting cell.')
        }),
        rowSpan: z.number().optional().describe('The row span of the table range. Defaults to 1.'),
        columnSpan: z.number().optional().describe('The column span of the table range. Defaults to 1.')
    })
});

const BatchUpdateResponseSchema = z.object({
    documentId: z.string(),
    replies: z.array(z.object({}).passthrough()).optional(),
    writeLocation: z
        .object({
            index: z.number().optional(),
            segmentId: z.string().optional(),
            tabId: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Unmerge previously merged table cells in a Google Doc.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/unmerge-table-cells',
        group: 'Tables'
    },
    input: InputSchema,
    output: BatchUpdateResponseSchema,
    scopes: ['documents'],

    exec: async (nango, input) => {
        const response = await nango.post({
            // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
            endpoint: `/v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        unmergeTableCells: {
                            tableRange: input.tableRange
                        }
                    }
                ]
            },
            retries: 3
        });

        const parsed = BatchUpdateResponseSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
