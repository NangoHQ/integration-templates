import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tableId: z.number().int().positive().describe('Table ID. Example: 1080602'),
    rowId: z.number().int().positive().describe('Row ID. Example: 9'),
    fields: z.record(z.string(), z.unknown()).describe('Partial row fields to update. Keys are field_<id> or display names when user_field_names is true.'),
    userFieldNames: z.boolean().optional().describe('If true, use display names as field keys instead of field_<id>.')
});

const OutputSchema = z
    .object({
        id: z.number(),
        order: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Update a row.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['database:row:update'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://api.baserow.io/api/redoc/
            endpoint: `/database/rows/table/${encodeURIComponent(String(input.tableId))}/${encodeURIComponent(String(input.rowId))}/`,
            params: {
                ...(input.userFieldNames !== undefined && { user_field_names: String(input.userFieldNames) })
            },
            data: input.fields,
            retries: 3
        });

        const row = OutputSchema.parse(response.data);
        return row;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
