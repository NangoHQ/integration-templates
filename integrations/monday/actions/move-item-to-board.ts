import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    item_id: z.string().describe('The unique identifier of the item to move. Example: "2933602562"'),
    board_id: z.string().describe('The unique identifier of the target board. Example: "5096980652"'),
    group_id: z.string().describe('The unique identifier of the target group on the target board. Example: "new_group"')
});

const ProviderItemSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    board: z
        .object({
            id: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    group: z
        .object({
            id: z.string().nullable().optional(),
            title: z.string().nullable().optional()
        })
        .nullable()
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    board_id: z.string().optional(),
    group_id: z.string().optional(),
    group_title: z.string().optional()
});

const action = createAction({
    description: 'Move an item to another board.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/move-item-to-board',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.monday.com/api-reference/reference/items#move_item_to_board
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query: 'mutation($itemId: ID!, $boardId: ID!, $groupId: ID!) { move_item_to_board(item_id: $itemId, board_id: $boardId, group_id: $groupId) { id name board { id } group { id title } } }',
                variables: {
                    itemId: input.item_id,
                    boardId: input.board_id,
                    groupId: input.group_id
                }
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from provider.'
            });
        }

        const responseData = z
            .object({
                data: z
                    .object({
                        move_item_to_board: ProviderItemSchema.nullable().optional()
                    })
                    .nullable()
                    .optional(),
                errors: z
                    .array(
                        z.object({
                            message: z.string(),
                            extensions: z
                                .object({
                                    code: z.string().optional()
                                })
                                .optional()
                        })
                    )
                    .nullable()
                    .optional()
            })
            .parse(response.data);

        const firstError = responseData.errors?.[0];
        if (firstError) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstError.message,
                code: firstError.extensions?.code
            });
        }

        const item = responseData.data?.move_item_to_board;

        if (!item) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Item not found or could not be moved.'
            });
        }

        return {
            id: item.id,
            ...(item.name != null && { name: item.name }),
            ...(item.board?.id != null && { board_id: item.board.id }),
            ...(item.group?.id != null && { group_id: item.group.id }),
            ...(item.group?.title != null && { group_title: item.group.title })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
