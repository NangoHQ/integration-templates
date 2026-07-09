import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    state: z.string().optional(),
    creator_id: z.string().optional(),
    url: z.string().optional(),
    board_id: z.string().optional(),
    group_id: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const BoardSchema = z.object({
    id: z.string()
});

const BoardsResponseSchema = z.object({
    data: z
        .object({
            boards: z.array(BoardSchema).nullable().optional()
        })
        .nullable()
        .optional(),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const ItemNodeSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    state: z.string().optional(),
    creator_id: z.string().optional(),
    url: z.string().optional(),
    board: z
        .object({
            id: z.string()
        })
        .optional(),
    group: z
        .object({
            id: z.string().nullable().optional()
        })
        .optional()
});

const ItemsPageSchema = z.object({
    cursor: z.string().nullable().optional(),
    items: z.array(ItemNodeSchema)
});

const ItemsPageByBoardSchema = z.object({
    data: z
        .object({
            boards: z
                .array(
                    z.object({
                        items_page: ItemsPageSchema
                    })
                )
                .optional(),
            next_items_page: ItemsPageSchema.optional()
        })
        .optional()
});

const sync = createSync({
    description: 'Sync items from monday.com',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Item: ItemSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.['updated_after'];

        const boardsConfig: ProxyConfiguration = {
            // https://developer.monday.com/api-reference/docs/boards#queries
            endpoint: '/v2',
            method: 'POST',
            data: {
                query: 'query { boards(limit: 500, state: active) { id } }'
            },
            retries: 3
        };

        const boardsResponse = await nango.post(boardsConfig);
        const parsedBoards = BoardsResponseSchema.parse(boardsResponse);

        if (parsedBoards.errors && parsedBoards.errors.length > 0) {
            throw new Error(`GraphQL error fetching boards: ${parsedBoards.errors[0]?.message}`);
        }

        const boards = parsedBoards.data?.boards ?? [];

        if (boards.length === 0) {
            return;
        }

        let maxUpdatedAt: string | undefined;

        for (const board of boards) {
            let cursor: string | undefined;
            let hasMorePages = true;

            while (hasMorePages) {
                let pageResponse: unknown;

                if (!cursor) {
                    const query = updatedAfter
                        ? `query {
                            boards(ids: [${board.id}]) {
                                items_page(
                                    limit: 25
                                    query_params: {
                                        rules: [
                                            {
                                                column_id: "__last_updated__"
                                                compare_value: ["${updatedAfter}"]
                                                operator: greater_than
                                            }
                                        ]
                                        order_by: [
                                            {
                                                column_id: "__last_updated__"
                                                direction: asc
                                            }
                                        ]
                                    }
                                ) {
                                    cursor
                                    items {
                                        id
                                        name
                                        created_at
                                        updated_at
                                        state
                                        creator_id
                                        url
                                        board { id }
                                        group { id }
                                    }
                                }
                            }
                        }`
                        : `query {
                            boards(ids: [${board.id}]) {
                                items_page(limit: 25) {
                                    cursor
                                    items {
                                        id
                                        name
                                        created_at
                                        updated_at
                                        state
                                        creator_id
                                        url
                                        board { id }
                                        group { id }
                                    }
                                }
                            }
                        }`;

                    const itemsConfig: ProxyConfiguration = {
                        // https://developer.monday.com/api-reference/reference/items-page
                        endpoint: '/v2',
                        method: 'POST',
                        data: { query },
                        retries: 3
                    };

                    pageResponse = await nango.post(itemsConfig);
                } else {
                    const query = `query {
                        next_items_page(limit: 25, cursor: "${cursor}") {
                            cursor
                            items {
                                id
                                name
                                created_at
                                updated_at
                                state
                                creator_id
                                url
                                board { id }
                                group { id }
                            }
                        }
                    }`;

                    const nextItemsConfig: ProxyConfiguration = {
                        // https://developer.monday.com/api-reference/reference/next-items-page
                        endpoint: '/v2',
                        method: 'POST',
                        data: { query },
                        retries: 3
                    };

                    pageResponse = await nango.post(nextItemsConfig);
                }

                const parsed = ItemsPageByBoardSchema.parse(pageResponse);
                const pageData = cursor ? parsed.data?.next_items_page : parsed.data?.boards?.[0]?.items_page;

                if (!pageData) {
                    throw new Error('Unexpected response structure from monday.com items query');
                }

                const items = pageData.items ?? [];
                const nextCursor = pageData.cursor;

                if (items.length > 0) {
                    const mappedItems = items.map((item) => ({
                        id: item.id,
                        ...(item.name != null && { name: item.name }),
                        ...(item.created_at != null && { created_at: item.created_at }),
                        ...(item.updated_at != null && { updated_at: item.updated_at }),
                        ...(item.state != null && { state: item.state }),
                        ...(item.creator_id != null && { creator_id: item.creator_id }),
                        ...(item.url != null && { url: item.url }),
                        ...(item.board?.id != null && { board_id: item.board.id }),
                        ...(item.group?.id != null && { group_id: item.group.id })
                    }));

                    await nango.batchSave(mappedItems, 'Item');

                    for (const item of items) {
                        if (item.updated_at && (maxUpdatedAt === undefined || item.updated_at > maxUpdatedAt)) {
                            maxUpdatedAt = item.updated_at;
                        }
                    }
                }

                if (nextCursor) {
                    cursor = nextCursor;
                } else {
                    hasMorePages = false;
                }
            }
        }

        if (maxUpdatedAt) {
            await nango.saveCheckpoint({ updated_after: maxUpdatedAt });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
