import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tableId: z.number().describe('Table ID. Example: 1080602'),
    rowId: z.number().describe('Row ID to move. Example: 12'),
    beforeId: z.number().optional().describe('Row ID to move immediately before. Omit to move to the end of the table.')
});

const OutputSchema = z
    .object({
        id: z.number(),
        order: z.string()
    })
    .passthrough();

const action = createAction({
    description: 'Move a row to a new position (reorder within the table).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.beforeId !== undefined) {
            params['before_id'] = String(input.beforeId);
        }

        const response = await nango.patch({
            // https://api.baserow.io/api/redoc/
            endpoint: `/database/rows/table/${encodeURIComponent(String(input.tableId))}/${encodeURIComponent(String(input.rowId))}/move/`,
            params,
            retries: 3
        });

        const row = OutputSchema.parse(response.data);
        return row;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
