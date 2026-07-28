import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    itemId: z.string().describe('Workbook item ID. Example: "01RFYLAYDQCQAOBGW2GVAYDEQMDDBL6JYU"'),
    worksheetIdOrName: z.string().describe('Worksheet ID or name. Example: "Sheet1"'),
    name: z.string().optional().describe('New name for the worksheet.'),
    position: z.number().int().optional().describe('New zero-based position index for the worksheet tab.')
});

const ProviderWorksheetSchema = z.object({
    id: z.string(),
    name: z.string(),
    position: z.number().int(),
    visibility: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    position: z.number().int(),
    visibility: z.string().optional()
});

const action = createAction({
    description: 'Rename a worksheet and/or change its tab position.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.name === undefined && input.position === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of "name" or "position" must be provided.'
            });
        }

        const body: { name?: string; position?: number } = {};
        if (input.name !== undefined) {
            body.name = input.name;
        }
        if (input.position !== undefined) {
            body.position = input.position;
        }

        // https://learn.microsoft.com/en-us/graph/api/worksheet-update
        const response = await nango.patch({
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/workbook/worksheets('${encodeURIComponent(input.worksheetIdOrName)}')`,
            data: body,
            retries: 3
        });

        const providerWorksheet = ProviderWorksheetSchema.parse(response.data);

        return {
            id: providerWorksheet.id,
            name: providerWorksheet.name,
            position: providerWorksheet.position,
            ...(providerWorksheet.visibility !== undefined && { visibility: providerWorksheet.visibility })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
