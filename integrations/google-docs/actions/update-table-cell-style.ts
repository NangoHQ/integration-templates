import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const RgbColorSchema = z.object({
    red: z.number().optional(),
    green: z.number().optional(),
    blue: z.number().optional()
});

const OptionalColorSchema = z.object({
    color: z
        .object({
            rgbColor: RgbColorSchema.optional()
        })
        .optional()
});

const DimensionSchema = z.object({
    magnitude: z.number(),
    unit: z.string()
});

const TableCellBorderSchema = z.object({
    color: OptionalColorSchema.optional(),
    width: DimensionSchema.optional(),
    dashStyle: z.string().optional().describe('Border dash style. Example: "SOLID", "DOT", "DASH".')
});

const TableStartLocationSchema = z.object({
    index: z.number().describe('The zero-based index of the table in the document body.'),
    segmentId: z.string().optional().describe('The segment ID of the table location. Omit for the body segment.'),
    tabId: z.string().optional().describe('The tab ID for multi-tab documents. Example: "t.0".')
});

const TableCellLocationSchema = z.object({
    tableStartLocation: TableStartLocationSchema,
    rowIndex: z.number().describe('Zero-based row index of the starting cell.'),
    columnIndex: z.number().describe('Zero-based column index of the starting cell.')
});

const TableRangeSchema = z.object({
    tableCellLocation: TableCellLocationSchema,
    rowSpan: z.number().optional().describe('Number of rows in the range. Defaults to 1.'),
    columnSpan: z.number().optional().describe('Number of columns in the range. Defaults to 1.')
});

const TableCellStyleSchema = z.object({
    backgroundColor: OptionalColorSchema.optional().describe('Background color of the cell.'),
    borderLeft: TableCellBorderSchema.optional().describe('Left border style.'),
    borderRight: TableCellBorderSchema.optional().describe('Right border style.'),
    borderTop: TableCellBorderSchema.optional().describe('Top border style.'),
    borderBottom: TableCellBorderSchema.optional().describe('Bottom border style.'),
    paddingLeft: DimensionSchema.optional().describe('Left padding.'),
    paddingRight: DimensionSchema.optional().describe('Right padding.'),
    paddingTop: DimensionSchema.optional().describe('Top padding.'),
    paddingBottom: DimensionSchema.optional().describe('Bottom padding.'),
    contentAlignment: z.string().optional().describe('Vertical content alignment. Example: "TOP", "MIDDLE", "BOTTOM".')
});

const InputSchema = z.object({
    documentId: z.string().describe('Google Docs document ID. Example: "1Kj3d86Z-Sfd56YP4dImQ-ggMRyP2QZ_BRO33zOO224c"'),
    tableRange: TableRangeSchema,
    tableCellStyle: TableCellStyleSchema,
    fields: z.string().describe('Field mask for properties to update. Example: "backgroundColor" or "*". The root tableCellStyle is implied.')
});

const BatchUpdateResponseSchema = z.object({
    documentId: z.string(),
    replies: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    documentId: z.string(),
    replies: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Update background, borders, padding, or alignment for table cells.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-table-cell-style',
        group: 'Documents'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['documents'],

    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
            endpoint: `v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        updateTableCellStyle: {
                            tableRange: input.tableRange,
                            tableCellStyle: input.tableCellStyle,
                            fields: input.fields
                        }
                    }
                ]
            },
            retries: 3
        };

        const response = await nango.post(config);
        const parsed = BatchUpdateResponseSchema.parse(response.data);

        return {
            documentId: parsed.documentId,
            ...(parsed.replies !== undefined && { replies: parsed.replies })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
