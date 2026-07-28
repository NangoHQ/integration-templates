import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    drive_id: z.string().describe('The ID of the drive containing the workbook. Example: "b!abc123"'),
    item_id: z.string().describe('The ID of the workbook file (drive item). Example: "01RFYLAYDQCQAOBGW2GVAYDEQMDDBL6JYU"'),
    calculation_type: z.enum(['Recalculate', 'Full', 'FullRebuild']).optional().describe('The calculation type. Defaults to "Recalculate".')
});

const OutputSchema = z.object({
    success: z.literal(true)
});

const action = createAction({
    description: 'Force recalculation of all formulas in the workbook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/resources/excel
        await nango.post({
            endpoint: `v1.0/drives/${encodeURIComponent(input.drive_id)}/items/${encodeURIComponent(input.item_id)}/workbook/application/calculate`,
            data: {
                calculationType: input.calculation_type ?? 'Recalculate'
            },
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
