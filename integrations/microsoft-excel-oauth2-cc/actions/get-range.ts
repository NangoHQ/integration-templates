import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    itemId: z.string().describe('Workbook item ID. Example: "01RFYLAYDQCQAOBGW2GVAYDEQMDDBL6JYU"'),
    worksheetIdOrName: z.string().describe('Worksheet ID or name. Example: "Sheet1"'),
    address: z.string().describe('Range address. Example: "A1:C2"')
});

const ProviderRangeSchema = z.object({
    address: z.string().optional(),
    values: z.array(z.array(z.unknown())).optional(),
    text: z.array(z.array(z.unknown())).optional(),
    formulas: z.array(z.array(z.unknown())).optional(),
    numberFormat: z.array(z.array(z.unknown())).optional()
});

const OutputSchema = z.object({
    address: z.string().optional(),
    values: z.array(z.array(z.unknown())).optional(),
    text: z.array(z.array(z.unknown())).optional(),
    formulas: z.array(z.array(z.unknown())).optional(),
    numberFormat: z.array(z.array(z.unknown())).optional()
});

const action = createAction({
    description: 'Read cell values from a specific range on a worksheet.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read.All', 'Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // OData string literals require embedded single quotes to be doubled.
        const encodedWorksheet = encodeURIComponent(input.worksheetIdOrName.replace(/'/g, "''"));
        const encodedAddress = encodeURIComponent(input.address.replace(/'/g, "''"));

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/resources/excel
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/workbook/worksheets('${encodedWorksheet}')/range(address='${encodedAddress}')`,
            retries: 3
        });

        const providerRange = ProviderRangeSchema.parse(response.data);

        return {
            ...(providerRange.address !== undefined && { address: providerRange.address }),
            ...(providerRange.values !== undefined && { values: providerRange.values }),
            ...(providerRange.text !== undefined && { text: providerRange.text }),
            ...(providerRange.formulas !== undefined && { formulas: providerRange.formulas }),
            ...(providerRange.numberFormat !== undefined && { numberFormat: providerRange.numberFormat })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
