import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().describe('The board ID to create the item on. Example: "5096980653"'),
    group_id: z.string().optional().describe('The group ID to create the item in. Example: "topics"'),
    item_name: z.string().describe('The name of the new item.'),
    column_values: z.record(z.string(), z.unknown()).optional().describe('Column values as a JSON object. Keys are column IDs, values are type-specific.'),
    create_labels_if_missing: z.boolean().optional().describe('Whether to create missing status/dropdown labels.'),
    relative_to: z.string().optional().describe('The item ID to position the new item relative to.'),
    position_relative_method: z.enum(['before_at', 'after_at']).optional().describe('Position relative to the specified item.')
});

const ProviderItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    url: z.string().optional(),
    board: z
        .object({
            id: z.string()
        })
        .optional(),
    group: z
        .object({
            id: z.string(),
            title: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    url: z.string().optional(),
    board_id: z.string().optional(),
    group_id: z.string().optional(),
    group_title: z.string().optional()
});

const action = createAction({
    description: 'Create an item in monday.com.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const variables: Record<string, unknown> = {
            boardId: input.board_id,
            itemName: input.item_name,
            ...(input.group_id !== undefined && { groupId: input.group_id }),
            ...(input.column_values !== undefined && { columnValues: JSON.stringify(input.column_values) }),
            ...(input.create_labels_if_missing !== undefined && { createLabelsIfMissing: input.create_labels_if_missing }),
            ...(input.relative_to !== undefined && { relativeTo: input.relative_to }),
            ...(input.position_relative_method !== undefined && { positionRelativeMethod: input.position_relative_method })
        };

        // https://developer.monday.com/api-reference/reference/items#create-item
        const response = await nango.post({
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query: `
                    mutation ($boardId: ID!, $groupId: String, $itemName: String!, $columnValues: JSON, $createLabelsIfMissing: Boolean, $relativeTo: ID, $positionRelativeMethod: PositionRelative) {
                        create_item(
                            board_id: $boardId,
                            group_id: $groupId,
                            item_name: $itemName,
                            column_values: $columnValues,
                            create_labels_if_missing: $createLabelsIfMissing,
                            relative_to: $relativeTo,
                            position_relative_method: $positionRelativeMethod
                        ) {
                            id
                            name
                            url
                            board {
                                id
                            }
                            group {
                                id
                                title
                            }
                        }
                    }
                `,
                variables
            },
            retries: 3
        });

        const responseData = z
            .object({
                data: z
                    .object({
                        create_item: ProviderItemSchema
                    })
                    .optional(),
                errors: z.array(z.unknown()).optional()
            })
            .parse(response.data);

        if (responseData.errors && responseData.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'monday.com API returned errors',
                errors: responseData.errors
            });
        }

        const item = responseData.data?.create_item;
        if (!item) {
            throw new nango.ActionError({
                type: 'missing_data',
                message: 'Create item response did not contain item data'
            });
        }

        return {
            id: item.id,
            ...(item.name !== undefined && { name: item.name }),
            ...(item.url !== undefined && { url: item.url }),
            ...(item.board?.id !== undefined && { board_id: item.board.id }),
            ...(item.group?.id !== undefined && { group_id: item.group.id }),
            ...(item.group?.title !== undefined && { group_title: item.group.title })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
