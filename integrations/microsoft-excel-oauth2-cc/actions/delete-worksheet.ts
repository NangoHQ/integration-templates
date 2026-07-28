import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID containing the workbook. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    itemId: z.string().describe('Item ID of the workbook. Example: "01RFYLAYDQCQAOBGW2GVAYDEQMDDBL6JYU"'),
    worksheetIdOrName: z.string().describe('Worksheet ID or name to delete. Example: "Sheet1" or "RegistrySeedSheet2"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    driveId: z.string(),
    itemId: z.string(),
    worksheetIdOrName: z.string()
});

const action = createAction({
    description: 'Delete a worksheet from a workbook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/worksheet-delete
        await nango.delete({
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/workbook/worksheets('${encodeURIComponent(input.worksheetIdOrName)}')`,
            retries: 3
        });

        return {
            success: true,
            driveId: input.driveId,
            itemId: input.itemId,
            worksheetIdOrName: input.worksheetIdOrName
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
