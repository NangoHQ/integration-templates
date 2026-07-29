import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID. Example: "b!abc123"'),
    itemId: z.string().describe('Workbook item ID. Example: "01RFYLAYDQCQAOBGW2GVAYDEQMDDBL6JYU"'),
    address: z.string().describe('Range address for the table. Example: "Sheet1!A1:C2"'),
    hasHeaders: z.boolean().optional().describe('Whether the first row of the range contains headers.')
});

const TableColumnSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    values: z.array(z.unknown()).optional()
});

const TableRowSchema = z.object({
    index: z.number().optional(),
    values: z.array(z.unknown()).optional()
});

const ProviderTableSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    showHeaders: z.boolean().optional(),
    showTotals: z.boolean().optional(),
    style: z.string().optional(),
    highlightLastColumn: z.boolean().optional(),
    highlightFirstColumn: z.boolean().optional(),
    columns: z.array(TableColumnSchema).optional(),
    rows: z.array(TableRowSchema).optional()
});

const OutputSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    showHeaders: z.boolean().optional(),
    showTotals: z.boolean().optional(),
    style: z.string().optional(),
    highlightLastColumn: z.boolean().optional(),
    highlightFirstColumn: z.boolean().optional(),
    columns: z.array(TableColumnSchema).optional(),
    rows: z.array(TableRowSchema).optional()
});

const action = createAction({
    description: 'Create a table from an existing range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://learn.microsoft.com/en-us/graph/api/tablecollection-add
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/workbook/tables/add`,
            data: {
                address: input.address,
                ...(input.hasHeaders !== undefined && { hasHeaders: input.hasHeaders })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Provider returned empty response when adding table.'
            });
        }

        const table = ProviderTableSchema.parse(response.data);

        return {
            ...(table.id !== undefined && { id: table.id }),
            ...(table.name !== undefined && { name: table.name }),
            ...(table.showHeaders !== undefined && { showHeaders: table.showHeaders }),
            ...(table.showTotals !== undefined && { showTotals: table.showTotals }),
            ...(table.style !== undefined && { style: table.style }),
            ...(table.highlightLastColumn !== undefined && { highlightLastColumn: table.highlightLastColumn }),
            ...(table.highlightFirstColumn !== undefined && { highlightFirstColumn: table.highlightFirstColumn }),
            ...(table.columns !== undefined && { columns: table.columns }),
            ...(table.rows !== undefined && { rows: table.rows })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
