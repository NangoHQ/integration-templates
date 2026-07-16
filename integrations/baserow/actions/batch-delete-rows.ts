import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tableId: z.number().int().describe('Table ID. Example: 1080602'),
    items: z.array(z.number().int()).min(1).max(200).describe('Array of 1 to 200 row IDs to delete. Example: [15, 16]')
});

const OutputSchema = z.object({
    success: z.boolean(),
    deletedCount: z.number().int()
});

const action = createAction({
    description: 'Delete up to 200 rows in a single request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.baserow.io/api/redoc/
        await nango.post({
            endpoint: `/database/rows/table/${encodeURIComponent(String(input.tableId))}/batch-delete/`,
            data: {
                items: input.items
            },
            retries: 1
        });

        return {
            success: true,
            deletedCount: input.items.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
