import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const RowUpdateItemSchema = z
    .object({
        id: z.number().int().describe('Row ID to update. Example: 17')
    })
    .passthrough()
    .describe('Row update payload. Must include id plus only the fields being changed.');

const InputSchema = z.object({
    tableId: z.number().int().describe('The table ID. Example: 1080602'),
    items: z.array(RowUpdateItemSchema).min(1).max(200).describe('Rows to update. 1 to 200 items.'),
    userFieldNames: z.boolean().optional().describe('If true, use field display names instead of field_<id> keys in the request and response.')
});

const BaserowRowSchema = z
    .object({
        id: z.number(),
        order: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(BaserowRowSchema).describe('Updated rows.')
});

const action = createAction({
    description: 'Update up to 200 rows in a single request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            // https://api.baserow.io/api/redoc/
            endpoint: `/database/rows/table/${encodeURIComponent(input.tableId)}/batch/`,
            params: {
                ...(input.userFieldNames !== undefined && { user_field_names: input.userFieldNames ? 'true' : 'false' })
            },
            data: {
                items: input.items
            },
            retries: 3
        };

        const response = await nango.patch(config);

        const parsed = OutputSchema.parse(response.data);

        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
