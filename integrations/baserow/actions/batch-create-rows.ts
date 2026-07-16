import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tableId: z.number().int().describe('Table ID. Example: 1080602'),
    items: z
        .array(z.record(z.string(), z.unknown()))
        .min(1)
        .max(200)
        .describe('Row field objects to create. Each object uses field_<id> keys (or display names when userFieldNames is true). Minimum 1, maximum 200.'),
    userFieldNames: z.boolean().optional().describe('If true, use user-specified field names instead of field_<id> keys in request and response.'),
    before: z.number().int().optional().describe('If provided, inserts all new rows immediately before the row with this id.')
});

const ProviderRowSchema = z
    .object({
        id: z.number(),
        order: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    items: z.array(ProviderRowSchema)
});

const OutputSchema = z.object({
    items: z.array(ProviderRowSchema)
});

const action = createAction({
    description: 'Create up to 200 rows in a single request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['table:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://api.baserow.io/api/redoc/#tag/Database-table-rows/operation/batch_create_database_table_rows
            endpoint: `/database/rows/table/${encodeURIComponent(String(input.tableId))}/batch/`,
            params: {
                ...(input.userFieldNames !== undefined && { user_field_names: input.userFieldNames ? 'true' : 'false' }),
                ...(input.before !== undefined && { before: input.before })
            },
            data: {
                items: input.items
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
