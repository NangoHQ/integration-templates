import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    parent_item_id: z.string().describe('The parent item ID. Example: "2933602562"'),
    item_name: z.string().describe('The new subitem name. Example: "Design mockup"')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            create_subitem: z
                .object({
                    id: z.string(),
                    name: z.string().nullable().optional(),
                    board: z
                        .object({
                            id: z.string()
                        })
                        .optional()
                })
                .nullable()
                .optional()
        })
        .nullable()
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    board_id: z.string()
});

const action = createAction({
    description: 'Create a subitem under a parent item in monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-subitem',
        group: 'Subitems'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.monday.com/api-reference/reference/subitems#create-a-subitem
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query: `
                    mutation ($parentItemId: ID!, $itemName: String!) {
                        create_subitem(
                            parent_item_id: $parentItemId
                            item_name: $itemName
                        ) {
                            id
                            name
                            board {
                                id
                            }
                        }
                    }
                `,
                variables: {
                    parentItemId: input.parent_item_id,
                    itemName: input.item_name
                }
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.errors.map((e) => e.message).join('; ')
            });
        }

        const subitem = providerResponse.data?.create_subitem;
        if (!subitem || !subitem.id || !subitem.board?.id) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from monday.com API: missing subitem data.'
            });
        }

        return {
            id: subitem.id,
            ...(subitem.name != null && { name: subitem.name }),
            board_id: subitem.board.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
