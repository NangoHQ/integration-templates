import { z } from 'zod';
import { createAction } from 'nango';

const ItemsQueryOrderBySchema = z.object({
    column_id: z.string(),
    direction: z.enum(['asc', 'desc']).optional()
});

const ItemsQueryRuleSchema = z.object({
    column_id: z.string(),
    compare_value: z.union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))]).optional(),
    operator: z.string().optional(),
    compare_attribute: z.string().optional()
});

const ItemsQueryParamsSchema = z
    .object({
        rules: z.array(ItemsQueryRuleSchema).optional(),
        operator: z.enum(['and', 'or']).optional(),
        order_by: z.array(ItemsQueryOrderBySchema).optional(),
        ids: z.array(z.string()).optional()
    })
    .passthrough();

const InputSchema = z.object({
    board_id: z.string().describe('The board ID to list items from. Example: "5096980653"'),
    limit: z.number().int().min(1).max(500).optional().describe('Number of items to return. Maximum is 500. Default is 25.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    query_params: ItemsQueryParamsSchema.optional().describe('Filter, sort, and scope parameters. Cannot be used with cursor.')
});

const ColumnValueSchema = z.object({
    id: z.string(),
    text: z.string().nullable().optional(),
    value: z.string().nullable().optional()
});

const GroupSchema = z.object({
    id: z.string(),
    title: z.string().optional()
});

const BoardRefSchema = z.object({
    id: z.string()
});

const ProviderItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    state: z.string().optional(),
    group: GroupSchema.optional(),
    board: BoardRefSchema.optional(),
    column_values: z.array(ColumnValueSchema).optional()
});

const ProviderItemsPageSchema = z.object({
    cursor: z.string().nullable().optional(),
    items: z.array(ProviderItemSchema)
});

const ProviderBoardSchema = z.object({
    items_page: ProviderItemsPageSchema
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            boards: z.array(ProviderBoardSchema).nullable().optional()
        })
        .optional()
});

const OutputItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    state: z.string().optional(),
    board_id: z.string().optional(),
    group_id: z.string().optional(),
    group_title: z.string().optional(),
    column_values: z.array(ColumnValueSchema).optional()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List items from monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-items',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor && input.query_params) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Cannot use query_params and cursor in the same request. Use query_params for the first request and cursor for paginated requests.'
            });
        }

        const variables: {
            boardIds: string[];
            limit: number;
            cursor?: string;
            queryParams?: unknown;
        } = {
            boardIds: [input.board_id],
            limit: input.limit ?? 25
        };

        if (input.cursor) {
            variables.cursor = input.cursor;
        }

        if (input.query_params) {
            variables.queryParams = input.query_params;
        }

        const query = `
            query($boardIds: [ID!]!, $limit: Int, $cursor: String, $queryParams: ItemsQuery) {
                boards(ids: $boardIds) {
                    items_page(limit: $limit, cursor: $cursor, query_params: $queryParams) {
                        cursor
                        items {
                            id
                            name
                            created_at
                            updated_at
                            state
                            group {
                                id
                                title
                            }
                            board {
                                id
                            }
                            column_values {
                                id
                                text
                                value
                            }
                        }
                    }
                }
            }
        `;

        // https://developer.monday.com/api-reference/reference/items-page
        const response = await nango.post({
            endpoint: '/v2',
            data: {
                query: query,
                variables: variables
            },
            retries: 3
        });

        if (
            response.data !== null &&
            typeof response.data === 'object' &&
            'errors' in response.data &&
            Array.isArray(response.data.errors) &&
            response.data.errors.length > 0
        ) {
            const firstError = response.data.errors[0];
            const message =
                firstError !== null && typeof firstError === 'object' && 'message' in firstError && typeof firstError.message === 'string'
                    ? firstError.message
                    : 'GraphQL error';
            throw new nango.ActionError({
                type: 'graphql_error',
                message: message
            });
        }

        const providerResponse = ProviderResponseSchema.safeParse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse provider response',
                details: providerResponse.error.message
            });
        }

        const parsed = providerResponse.data;
        const boards = parsed.data?.boards;

        if (!boards || boards.length === 0) {
            return {
                items: []
            };
        }

        const firstBoard = boards[0];
        if (!firstBoard) {
            return {
                items: []
            };
        }

        const itemsPage = firstBoard.items_page;
        const items = itemsPage.items.map((item) => ({
            id: item.id,
            name: item.name,
            ...(item.created_at !== undefined && { created_at: item.created_at }),
            ...(item.updated_at !== undefined && { updated_at: item.updated_at }),
            ...(item.state !== undefined && { state: item.state }),
            ...(item.board?.id !== undefined && { board_id: item.board.id }),
            ...(item.group?.id !== undefined && { group_id: item.group.id }),
            ...(item.group?.title !== undefined && { group_title: item.group.title }),
            ...(item.column_values !== undefined && {
                column_values: item.column_values.map((cv) => ({
                    id: cv.id,
                    ...(cv.text !== undefined && { text: cv.text }),
                    ...(cv.value !== undefined && { value: cv.value })
                }))
            })
        }));

        const nextCursor = itemsPage.cursor ?? undefined;

        return {
            items: items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
