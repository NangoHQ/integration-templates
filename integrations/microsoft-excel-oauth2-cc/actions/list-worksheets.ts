import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    drive_id: z.string().describe('Drive ID containing the workbook. Example: "b!abc123"'),
    item_id: z.string().describe('Item ID of the workbook file. Example: "01RFYLAY..."')
});

const ProviderWorksheetSchema = z.object({
    id: z.string(),
    name: z.string(),
    position: z.number().optional(),
    visibility: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    value: z.array(ProviderWorksheetSchema)
});

const WorksheetSchema = z.object({
    id: z.string(),
    name: z.string(),
    position: z.number().optional(),
    visibility: z.string().optional()
});

const OutputSchema = z.object({
    worksheets: z.array(WorksheetSchema)
});

const action = createAction({
    description: 'List worksheets in a workbook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read.All', 'Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/worksheet-list
            endpoint: `/v1.0/drives/${encodeURIComponent(input.drive_id)}/items/${encodeURIComponent(input.item_id)}/workbook/worksheets`,
            retries: 3
        });

        const parsed = ProviderListResponseSchema.parse(response.data);

        return {
            worksheets: parsed.value.map((worksheet) => ({
                id: worksheet.id,
                name: worksheet.name,
                ...(worksheet.position !== undefined && { position: worksheet.position }),
                ...(worksheet.visibility !== undefined && { visibility: worksheet.visibility })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
