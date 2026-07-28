import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID. Example: "b!abc123"'),
    itemId: z.string().describe('Workbook item (file) ID. Example: "01RFYLAY..."'),
    name: z.string().optional().describe('Name for the new worksheet. If omitted, Excel auto-generates a name.')
});

const ProviderWorksheetSchema = z.object({
    id: z.string(),
    name: z.string(),
    position: z.number(),
    visibility: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    position: z.number(),
    visibility: z.string().optional()
});

const action = createAction({
    description: 'Add a new worksheet to a workbook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const urlPath = `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/workbook/worksheets/add`;

        // https://learn.microsoft.com/en-us/graph/api/worksheetcollection-add
        const response = await nango.post({
            endpoint: urlPath,
            data: {
                ...(input.name !== undefined && { name: input.name })
            },
            retries: 3
        });

        const worksheet = ProviderWorksheetSchema.parse(response.data);

        return {
            id: worksheet.id,
            name: worksheet.name,
            position: worksheet.position,
            ...(worksheet.visibility !== undefined && { visibility: worksheet.visibility })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
