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

const sync = createSync({
    description: 'Sync subitems from monday.com',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/subitems' }],
    frequency: 'every hour',
    autoStart: true,
    models: {
        Subitem: SubitemSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('Subitem');

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
                offset_start_value: 1,
                limit_name_in_request: 'variables.limit',
                limit: 100,
                response_path: 'data.boards'
            },
            retries: 3
        };

        for await (const boardBatch of nango.paginate(boardProxyConfig)) {
            for (const rawBoard of boardBatch) {
                const board = BoardSchema.parse(rawBoard);

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
                            limit: 100
                        }
                    },
                    paginate: {
                        type: 'cursor',
                        cursor_name_in_request: 'variables.cursor',
                        cursor_path_in_response: 'data.boards.0.items_page.cursor',
                        response_path: 'data.boards.0.items_page.items',
                        limit_name_in_request: 'variables.limit',
                        limit: 100
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
                }
            }
        }

        await nango.trackDeletesEnd('Subitem');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
