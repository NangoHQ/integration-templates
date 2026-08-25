import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ColumnValueSchema = z.object({
    id: z.string(),
    text: z.string().optional()
});

const SubitemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    board_id: z.string(),
    column_values: z.array(ColumnValueSchema).optional()
});

const BoardSchema = z.object({
    id: z.string()
});

const RawColumnValueSchema = z.object({
    id: z.string(),
    text: z.string().nullish()
});

const RawSubitemSchema = z.object({
    id: z.string(),
    name: z.string().nullish(),
    board: z
        .object({
            id: z.string()
        })
        .optional(),
    column_values: z.array(RawColumnValueSchema).nullish()
});

const RawItemSchema = z.object({
    id: z.string(),
    subitems: z.array(RawSubitemSchema).nullish()
});

// Checkpoint stores the next board page to fetch, the current board being processed,
// and the next items_page cursor. Empty strings mean "not set" because ZodCheckpoint
// requires required scalar fields (string | number | boolean).
const CheckpointSchema = z.object({
    board_page: z.number().int().positive(),
    board_id: z.string(),
    item_cursor: z.string()
});

// Blocker: monday.com does not expose an updated_at or deleted-subitems endpoint,
// nor a changes feed for subitems. items_page only supports cursor pagination.
// Therefore a full refresh is required, checkpointed at the board-page and
// items-page cursor level so a timeout does not restart from board 1.
const sync = createSync({
    description: 'Sync subitems from monday.com',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Subitem: SubitemSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let resumeBoardId = checkpoint?.['board_id'] || undefined;
        let resumeItemCursor = checkpoint?.['item_cursor'] || undefined;

        if (resumeBoardId === '') {
            resumeBoardId = undefined;
        }
        if (resumeItemCursor === '') {
            resumeItemCursor = undefined;
        }
        const boardPage = resumeBoardId === undefined ? (checkpoint?.['board_page'] ?? 1) : 1;

        await nango.trackDeletesStart('Subitem');

        let currentBoardPage = boardPage;

        const boardProxyConfig: ProxyConfiguration = {
            // https://developer.monday.com/api-reference/docs
            endpoint: '/v2',
            method: 'POST',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query: `
                    query ($limit: Int, $page: Int) {
                        boards(limit: $limit, page: $page) {
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
                offset_calculation_method: 'per-page',
                offset_start_value: boardPage,
                limit_name_in_request: 'variables.limit',
                limit: 100,
                response_path: 'data.boards'
            },
            retries: 3
        };

        for await (const boardBatch of nango.paginate(boardProxyConfig)) {
            for (const rawBoard of boardBatch) {
                const board = BoardSchema.parse(rawBoard);

                // Skip boards already completed in a prior execution of this refresh
                if (resumeBoardId && board.id !== resumeBoardId) {
                    continue;
                }
                resumeBoardId = undefined;

                let nextItemCursor: string | undefined = resumeItemCursor;
                resumeItemCursor = undefined;

                const itemProxyConfig: ProxyConfiguration = {
                    // https://developer.monday.com/api-reference/docs
                    endpoint: '/v2',
                    method: 'POST',
                    headers: {
                        'api-version': '2026-04'
                    },
                    data: {
                        query: `
                            query ($boardId: ID!, $limit: Int, $cursor: String) {
                                boards(ids: [$boardId]) {
                                    items_page(limit: $limit, cursor: $cursor) {
                                        items {
                                            id
                                            subitems {
                                                id
                                                name
                                                board {
                                                    id
                                                }
                                                column_values {
                                                    id
                                                    text
                                                }
                                            }
                                        }
                                        cursor
                                    }
                                }
                            }
                        `,
                        variables: {
                            boardId: board.id,
                            limit: 100,
                            ...(nextItemCursor && { cursor: nextItemCursor })
                        }
                    },
                    paginate: {
                        type: 'cursor',
                        cursor_name_in_request: 'variables.cursor',
                        cursor_path_in_response: 'data.boards.0.items_page.cursor',
                        response_path: 'data.boards.0.items_page.items',
                        limit_name_in_request: 'variables.limit',
                        limit: 100,
                        on_page: async ({ nextPageParam }) => {
                            nextItemCursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                        }
                    },
                    retries: 3
                };

                for await (const itemBatch of nango.paginate(itemProxyConfig)) {
                    const subitems: Array<z.infer<typeof SubitemSchema>> = [];

                    for (const rawItem of itemBatch) {
                        const item = RawItemSchema.parse(rawItem);

                        for (const rawSubitem of item.subitems ?? []) {
                            subitems.push({
                                id: rawSubitem.id,
                                ...(rawSubitem.name != null && { name: rawSubitem.name }),
                                board_id: rawSubitem.board?.id ?? board.id,
                                ...(rawSubitem.column_values != null &&
                                    rawSubitem.column_values.length > 0 && {
                                        column_values: rawSubitem.column_values.map((cv) => ({
                                            id: cv.id,
                                            ...(cv.text != null && { text: cv.text })
                                        }))
                                    })
                            });
                        }
                    }

                    if (subitems.length > 0) {
                        await nango.batchSave(subitems, 'Subitem');
                    }

                    await nango.saveCheckpoint({
                        board_page: currentBoardPage,
                        board_id: board.id,
                        item_cursor: nextItemCursor ?? ''
                    });
                }
            }

            currentBoardPage += 1;
            if (resumeBoardId === undefined) {
                await nango.saveCheckpoint({
                    board_page: currentBoardPage,
                    board_id: '',
                    item_cursor: ''
                });
            }
        }

        if (resumeBoardId !== undefined) {
            await nango.saveCheckpoint({ board_page: 1, board_id: '', item_cursor: '' });
            throw new Error(`Checkpointed board ${resumeBoardId} is no longer accessible; restarting board enumeration`);
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Subitem');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
