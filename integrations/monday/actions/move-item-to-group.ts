import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    item_id: z.string().describe('Item ID. Example: "2933609588"'),
    group_id: z.string().describe('Group ID. Example: "topics", "new_group313"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            move_item_to_group: z
                .object({
                    id: z.string(),
                    name: z.string().nullable().optional()
                })
                .optional()
                .nullable()
        })
        .optional()
        .nullable(),
    errors: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Move an item to a different group within the same board.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.monday.com/api-reference/docs/items#move_item_to_group
        const response = await nango.post({
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query: 'mutation($item_id: ID!, $group_id: String!) { move_item_to_group(item_id: $item_id, group_id: $group_id) { id name } }',
                variables: {
                    item_id: input.item_id,
                    group_id: input.group_id
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response format from Monday API',
                details: parsed.error.issues
            });
        }

        const result = parsed.data.data?.move_item_to_group;

        if (!result) {
            const errors = parsed.data.errors;
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Failed to move item to group',
                ...(errors && { errors })
            });
        }

        return {
            id: result.id,
            ...(result.name != null && { name: result.name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
