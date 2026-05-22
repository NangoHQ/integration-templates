import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    item_id: z.string().describe('The unique identifier of the item to update. Example: "2933602562"'),
    board_id: z.string().describe('The unique identifier of the board containing the item. Example: "5096980653"'),
    column_values: z.record(z.string(), z.unknown()).describe('Column values to update keyed by column ID. Example: { "task_estimation": "5" }')
});

const ProviderColumnValueSchema = z.object({
    id: z.string().optional(),
    text: z.string().optional().nullable(),
    value: z.string().optional().nullable()
});

const ProviderItemSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    column_values: z.array(ProviderColumnValueSchema).optional().nullable()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            change_multiple_column_values: ProviderItemSchema.nullable().optional()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string().optional(),
                extensions: z
                    .object({
                        code: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    column_values: z
        .array(
            z.object({
                id: z.string().optional(),
                text: z.string().optional(),
                value: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Update a item in monday.com',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-item',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!/^\d+$/.test(input.board_id)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'board_id must be a numeric string'
            });
        }
        if (!/^\d+$/.test(input.item_id)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'item_id must be a numeric string'
            });
        }

        const columnValuesJson = JSON.stringify(input.column_values);
        const graphQLLiteral = JSON.stringify(columnValuesJson);

        const query = `mutation {
    change_multiple_column_values(
        board_id: "${input.board_id}"
        item_id: "${input.item_id}"
        column_values: ${graphQLLiteral}
    ) {
        id
        name
        column_values {
            id
            text
            value
        }
    }
}`;

        const response = await nango.post({
            // https://developer.monday.com/api-reference/docs/change-column-values
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const firstError = parsed.errors?.[0];
        if (firstError) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstError.message || 'Unknown provider error'
            });
        }

        if (!parsed.data?.change_multiple_column_values) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Item or board not found'
            });
        }

        const item = parsed.data.change_multiple_column_values;

        return {
            id: item.id,
            ...(item.name != null && { name: item.name }),
            ...(item.column_values != null && {
                column_values: item.column_values.map((cv) => ({
                    ...(cv.id != null && { id: cv.id }),
                    ...(cv.text != null && { text: cv.text }),
                    ...(cv.value != null && { value: cv.value })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
