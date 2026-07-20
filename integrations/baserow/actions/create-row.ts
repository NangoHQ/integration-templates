import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tableId: z.number().int().positive().describe('The ID of the table to create the row in. Example: 1080602'),
    fields: z.record(z.string(), z.unknown()).describe('Field values to set. Keys are field_<id> by default, or display names when userFieldNames is true.'),
    userFieldNames: z.boolean().optional().describe('If true, use field display names as keys in fields and response.'),
    before: z.number().int().positive().optional().describe('Row ID to insert the new row immediately before. Omit to append at the end.')
});

const OutputSchema = z
    .object({
        id: z.number(),
        order: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Create a row in a table.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.userFieldNames !== undefined) {
            params['user_field_names'] = input.userFieldNames ? 'true' : 'false';
        }
        if (input.before !== undefined) {
            params['before'] = input.before;
        }

        const response = await nango.post({
            // https://api.baserow.io/api/redoc/
            endpoint: `/database/rows/table/${encodeURIComponent(input.tableId)}/`,
            params,
            data: input.fields,
            retries: 3
        });

        const row = OutputSchema.parse(response.data);
        return row;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
