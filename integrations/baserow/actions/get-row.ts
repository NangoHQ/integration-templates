import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    table_id: z.number().describe('Table ID. Example: 1080602'),
    row_id: z.number().describe('Row ID. Example: 1'),
    user_field_names: z.boolean().optional().describe('Return field names instead of field IDs.')
});

const OutputSchema = z
    .object({
        id: z.number(),
        order: z.string()
    })
    .passthrough();

const action = createAction({
    description: 'Get a single row by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.baserow.io/api/redoc/
            endpoint: `/database/rows/table/${encodeURIComponent(String(input.table_id))}/${encodeURIComponent(String(input.row_id))}/`,
            params: {
                ...(input.user_field_names !== undefined && { user_field_names: String(input.user_field_names) })
            },
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Row not found or invalid response from Baserow.',
                table_id: input.table_id,
                row_id: input.row_id
            });
        }

        const providerRow = OutputSchema.parse(response.data);

        return providerRow;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
