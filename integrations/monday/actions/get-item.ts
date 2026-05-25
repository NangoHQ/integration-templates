import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    item_id: z.string().describe('The unique identifier of the item to retrieve. Example: "2933609588"')
});

const BoardSchema = z.object({
    id: z.string().optional()
});

const GroupSchema = z.object({
    id: z.string().optional(),
    title: z.string().optional()
});

const ProviderColumnValueSchema = z.object({
    id: z.string().optional(),
    text: z.string().nullable().optional(),
    value: z.string().nullable().optional(),
    type: z.string().optional()
});

const OutputColumnValueSchema = z.object({
    id: z.string().optional(),
    text: z.string().optional(),
    value: z.string().optional(),
    type: z.string().optional()
});

const UserSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional()
});

const ProviderItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    board: BoardSchema.optional(),
    group: GroupSchema.optional(),
    state: z.string().optional(),
    column_values: z.array(ProviderColumnValueSchema).optional(),
    creator: UserSchema.optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    board_id: z.string().optional(),
    group_id: z.string().optional(),
    group_title: z.string().optional(),
    state: z.string().optional(),
    column_values: z.array(OutputColumnValueSchema).optional(),
    creator: UserSchema.optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single item from monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-item',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!/^\d+$/.test(input.item_id)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'item_id must be a numeric string'
            });
        }

        const query = `
            query {
                items(ids: [${input.item_id}]) {
                    id
                    name
                    board {
                        id
                    }
                    group {
                        id
                        title
                    }
                    state
                    column_values {
                        id
                        text
                        value
                        type
                    }
                    creator {
                        id
                        name
                        email
                    }
                    created_at
                    updated_at
                }
            }
        `;

        const response = await nango.post({
            // https://developer.monday.com/api-reference/docs/items#queries
            endpoint: '/v2',
            data: { query },
            retries: 3,
            headers: {
                'api-version': '2026-04'
            }
        });

        const payload = response.data;

        if (payload && typeof payload === 'object' && 'errors' in payload && Array.isArray(payload.errors) && payload.errors.length > 0) {
            const firstError = payload.errors[0];
            const message = firstError && typeof firstError === 'object' && 'message' in firstError ? String(firstError.message) : 'Unknown GraphQL error';
            throw new nango.ActionError({
                type: 'provider_error',
                message
            });
        }

        if (!payload || typeof payload !== 'object' || !('data' in payload)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from monday.com API'
            });
        }

        const data = payload.data;

        if (!data || typeof data !== 'object' || !('items' in data) || !Array.isArray(data.items) || data.items.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Item with id ${input.item_id} was not found.`
            });
        }

        const rawItem = data.items[0];
        const providerItem = ProviderItemSchema.parse(rawItem);

        return {
            id: providerItem.id,
            name: providerItem.name,
            ...(providerItem.board?.id != null && { board_id: providerItem.board.id }),
            ...(providerItem.group?.id != null && { group_id: providerItem.group.id }),
            ...(providerItem.group?.title != null && { group_title: providerItem.group.title }),
            ...(providerItem.state != null && { state: providerItem.state }),
            ...(providerItem.column_values != null && {
                column_values: providerItem.column_values.map((cv) => ({
                    ...(cv.id != null && { id: cv.id }),
                    ...(cv.text != null && { text: cv.text }),
                    ...(cv.value != null && { value: cv.value }),
                    ...(cv.type != null && { type: cv.type })
                }))
            }),
            ...(providerItem.creator != null && { creator: providerItem.creator }),
            ...(providerItem.created_at != null && { created_at: providerItem.created_at }),
            ...(providerItem.updated_at != null && { updated_at: providerItem.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
