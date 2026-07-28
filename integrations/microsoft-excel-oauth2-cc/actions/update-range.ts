import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    itemId: z.string().describe('Workbook item ID. Example: "01RFYLAYDQCQAOBGW2GVAYDEQMDDBL6JYU"'),
    worksheetIdOrName: z.string().describe('Worksheet ID or name. Example: "Sheet1"'),
    address: z.string().describe('Range address. Example: "A1:C2"'),
    values: z.array(z.array(z.unknown())).describe('2D array of cell values matching the range row/column count')
});

const ProviderRangeSchema = z
    .object({
        address: z.string().optional(),
        cellCount: z.number().optional(),
        columnCount: z.number().optional(),
        rowCount: z.number().optional(),
        values: z.array(z.array(z.unknown())).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    address: z.string().optional(),
    cellCount: z.number().optional(),
    columnCount: z.number().optional(),
    rowCount: z.number().optional(),
    values: z.array(z.array(z.unknown())).optional()
});

const action = createAction({
    description: 'Write cell values into a specific range on a worksheet',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/graph/api/range-update
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/workbook/worksheets('${encodeURIComponent(input.worksheetIdOrName)}')/range(address='${encodeURIComponent(input.address)}')`,
            data: {
                values: input.values
            },
            retries: 1
        };

        const response = await nango.patch(config);
        const providerRange = ProviderRangeSchema.parse(response.data);

        return {
            ...(providerRange.address != null && { address: providerRange.address }),
            ...(providerRange.cellCount != null && { cellCount: providerRange.cellCount }),
            ...(providerRange.columnCount != null && { columnCount: providerRange.columnCount }),
            ...(providerRange.rowCount != null && { rowCount: providerRange.rowCount }),
            ...(providerRange.values != null && { values: providerRange.values })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
