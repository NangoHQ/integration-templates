import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    tableId: z.number().int().positive().describe('Table ID. Example: 1080602'),
    rowId: z.number().int().positive().describe('Row ID. Example: 1'),
    userFieldNames: z.boolean().optional().describe('Return field names instead of field IDs.')
});

const OutputSchema = z
    .object({
        id: z.number(),
        order: z.string().optional()
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
            endpoint: `/database/rows/table/${encodeURIComponent(String(input.tableId))}/${encodeURIComponent(String(input.rowId))}/`,
            params: {
                ...(input.userFieldNames !== undefined && { user_field_names: String(input.userFieldNames) })
            },
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Row not found or invalid response from Baserow.',
                tableId: input.tableId,
                rowId: input.rowId
            });
        }

        const providerRow = OutputSchema.parse(response.data);

        return providerRow;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
