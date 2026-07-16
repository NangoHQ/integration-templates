import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tableId: z.number().int().positive().describe('Table ID. Example: 1080602'),
    rowId: z.number().int().positive().describe('Row ID. Example: 7')
});

const OutputSchema = z.object({
    success: z.literal(true)
});

const action = createAction({
    description: 'Delete a row.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://nango.dev/docs/api-integrations/baserow
            endpoint: `/database/rows/table/${encodeURIComponent(input.tableId)}/${encodeURIComponent(input.rowId)}/`,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
