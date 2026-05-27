import { z } from 'zod';
import { createAction } from 'nango';

const TableStartLocationSchema = z.object({
    index: z.number().describe('The index of the table element in the document body. Example: 211'),
    segmentId: z.string().optional().describe('The segment ID; omit for the body segment. Example: ""')
});

const InputSchema = z.object({
    documentId: z.string().describe('The ID of the document containing the table. Example: "1Kj3d86Z-Sfd56YP4dImQ-ggMRyP2QZ_BRO33zOO224c"'),
    tableStartLocation: TableStartLocationSchema.describe('The location of the table in the document'),
    rowIndex: z.number().describe('The row index of the first cell in the range (0-based). Example: 0'),
    columnIndex: z.number().describe('The column index of the first cell in the range (0-based). Example: 0'),
    rowSpan: z.number().describe('The number of rows in the range. Example: 1'),
    columnSpan: z.number().describe('The number of columns in the range. Example: 2')
});

const BatchUpdateResponseSchema = z.object({
    documentId: z.string(),
    replies: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    documentId: z.string(),
    merged: z.boolean()
});

const action = createAction({
    description: 'Merge a rectangular range of table cells in a Google Doc',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/merge-table-cells',
        group: 'Tables'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive.file'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
        const response = await nango.post({
            endpoint: `/v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        mergeTableCells: {
                            tableRange: {
                                tableCellLocation: {
                                    tableStartLocation: {
                                        index: input.tableStartLocation.index,
                                        ...(input.tableStartLocation.segmentId !== undefined && {
                                            segmentId: input.tableStartLocation.segmentId
                                        })
                                    },
                                    rowIndex: input.rowIndex,
                                    columnIndex: input.columnIndex
                                },
                                rowSpan: input.rowSpan,
                                columnSpan: input.columnSpan
                            }
                        }
                    }
                ]
            },
            retries: 3
        });

        const parsed = BatchUpdateResponseSchema.parse(response.data);

        return {
            documentId: parsed.documentId,
            merged: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
