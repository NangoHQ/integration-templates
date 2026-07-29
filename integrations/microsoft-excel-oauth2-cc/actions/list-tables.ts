import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    itemId: z.string().describe('Workbook item ID. Example: "01RFYLAYDQCQAOBGW2GVAYDEQMDDBL6JYU"')
});

const TableSchema = z.object({
    id: z.string(),
    name: z.string(),
    showHeaders: z.boolean().optional(),
    showTotals: z.boolean().optional(),
    style: z.string().optional(),
    highlightFirstColumn: z.boolean().optional(),
    highlightLastColumn: z.boolean().optional(),
    showBandedColumns: z.boolean().optional(),
    showBandedRows: z.boolean().optional(),
    showFilterButton: z.boolean().optional()
});

const ProviderTableSchema = TableSchema.passthrough();

const ProviderTablesResponseSchema = z.object({
    value: z.array(ProviderTableSchema)
});

const OutputSchema = z.object({
    tables: z.array(TableSchema)
});

const action = createAction({
    description: 'List tables in a workbook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read.All', 'Sites.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/workbook-list-tables
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/workbook/tables`,
            retries: 3
        });

        const providerResponse = ProviderTablesResponseSchema.parse(response.data);

        const tables = providerResponse.value.map((table) => ({
            id: table.id,
            name: table.name,
            ...(table.showHeaders !== undefined && { showHeaders: table.showHeaders }),
            ...(table.showTotals !== undefined && { showTotals: table.showTotals }),
            ...(table.style !== undefined && { style: table.style }),
            ...(table.highlightFirstColumn !== undefined && { highlightFirstColumn: table.highlightFirstColumn }),
            ...(table.highlightLastColumn !== undefined && { highlightLastColumn: table.highlightLastColumn }),
            ...(table.showBandedColumns !== undefined && { showBandedColumns: table.showBandedColumns }),
            ...(table.showBandedRows !== undefined && { showBandedRows: table.showBandedRows }),
            ...(table.showFilterButton !== undefined && { showFilterButton: table.showFilterButton })
        }));

        return {
            tables
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
