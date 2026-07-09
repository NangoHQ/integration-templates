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

const GraphQLErrorsSchema = z.array(z.object({ message: z.string() })).optional();

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
                    z
                        .object({
                            items_page: ItemsPageSchema
                        })
                        .nullable()
                )
                .nullable()
                .optional()
        })
        .nullable()
        .optional(),
    errors: GraphQLErrorsSchema
});

// monday.com's `__last_updated__` pseudo-column rejects `greater_than` and
// `greater_than_or_equals` with a "no_operator_config" GraphQL error (verified against the
// live API) — `between` is the only operator it accepts. So incremental runs filter on a
// [checkpoint, now] window instead of an open-ended lower bound. Both edges are padded by a
// small buffer — the lower edge to re-include records that share the checkpoint's exact
// timestamp (relying on `batchSave` being an idempotent upsert to dedupe them), and the upper
// edge to tolerate minor clock skew between this process and monday.com's server.
const CHECKPOINT_BUFFER_MS = 1000;

function shiftIso(isoTimestamp: string, deltaMs: number): string {
    const parsed = new Date(isoTimestamp);
    if (Number.isNaN(parsed.getTime())) {
        return isoTimestamp;
    }
    return new Date(parsed.getTime() + deltaMs).toISOString();
}

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
        const runStartedAt = new Date().toISOString();

        const boardsConfig: ProxyConfiguration = {
            // https://developer.monday.com/api-reference/docs/boards#queries
            endpoint: '/v2',
            method: 'POST',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query: `
                    query ($limit: Int!, $page: Int!) {
                        boards(limit: $limit, page: $page, state: active) {
                            id
                        }
                    }
                `,
                variables: {
                    limit: 100,
                    page: 1
                }
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'variables.page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'variables.limit',
                limit: 100,
                response_path: 'data.boards'
            },
            retries: 3
        };

        const boards: Array<z.infer<typeof BoardSchema>> = [];

        for await (const page of nango.paginate(boardsConfig)) {
            for (const rawBoard of page) {
                boards.push(BoardSchema.parse(rawBoard));
            }
        }

        if (boards.length === 0) {
            return;
        }

        let maxUpdatedAt: string | undefined;

        for (const board of boards) {
            let cursor: string | undefined;
            let hasMorePages = true;

            while (hasMorePages) {
                const isFirstPage = !cursor;
                const queryParams =
                    isFirstPage && updatedAfter
                        ? {
                              rules: [
                                  {
                                      column_id: '__last_updated__',
                                      compare_value: [shiftIso(updatedAfter, -CHECKPOINT_BUFFER_MS), shiftIso(runStartedAt, CHECKPOINT_BUFFER_MS)],
                                      operator: 'between'
                                  }
                              ],
                              order_by: [
                                  {
                                      column_id: '__last_updated__',
                                      direction: 'asc'
                                  }
                              ]
                          }
                        : undefined;

                const itemsConfig: ProxyConfiguration = {
                    // https://developer.monday.com/api-reference/reference/items-page
                    endpoint: '/v2',
                    method: 'POST',
                    headers: {
                        'api-version': '2026-04'
                    },
                    data: {
                        query: `
                            query ($boardId: ID!, $limit: Int, $cursor: String, $queryParams: ItemsQuery) {
                                boards(ids: [$boardId]) {
                                    items_page(limit: $limit, cursor: $cursor, query_params: $queryParams) {
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
                            }
                        `,
                        variables: {
                            boardId: board.id,
                            limit: 25,
                            ...(cursor && { cursor }),
                            ...(queryParams && { queryParams })
                        }
                    },
                    retries: 3
                };

                const pageResponse = await nango.post(itemsConfig);
                const parsed = ItemsPageByBoardSchema.parse(pageResponse.data);

                if (parsed.errors && parsed.errors.length > 0) {
                    throw new Error(`GraphQL error fetching items for board ${board.id}: ${parsed.errors[0]?.message}`);
                }

                const boardEntry = parsed.data?.boards?.[0];

                if (boardEntry === null) {
                    // The board no longer exists or is inaccessible (e.g. deleted between board
                    // discovery and this call). Skip it instead of failing the whole sync.
                    hasMorePages = false;
                    break;
                }

                const pageData = boardEntry?.items_page;

                if (!pageData) {
                    throw new Error(`Unexpected response structure from monday.com items query for board ${board.id}`);
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
