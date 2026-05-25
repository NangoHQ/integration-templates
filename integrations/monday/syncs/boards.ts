import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const BoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    state: z.string(),
    board_kind: z.string(),
    updated_at: z.string(),
    workspace_id: z.string().optional(),
    url: z.string()
});

const RawBoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    state: z.string(),
    board_kind: z.string(),
    updated_at: z.string(),
    workspace_id: z.string().nullable().optional(),
    url: z.string()
});

const sync = createSync({
    description: 'Sync boards from monday.com.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/boards' }],
    models: {
        Board: BoardSchema
    },
    scopes: ['boards:read'],

    exec: async (nango) => {
        // Blocker: the monday.com boards query does not support an updated_since
        // or modified_since filter. The order_by argument only supports created_at
        // and used_at (both descending), not updated_at. There is no deleted-boards
        // endpoint or changes feed. Therefore a full refresh is required.
        await nango.trackDeletesStart('Board');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.monday.com/api-reference/reference/boards
            endpoint: '/v2',
            method: 'POST',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query: `
                    query ($limit: Int!, $page: Int!) {
                        boards(limit: $limit, page: $page, state: all) {
                            id
                            name
                            description
                            state
                            board_kind
                            updated_at
                            workspace_id
                            url
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

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected boards page to be an array');
            }

            const boards = page.map((record) => {
                const parsed = RawBoardSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Invalid board record: ${parsed.error.message}`);
                }
                return {
                    id: parsed.data.id,
                    name: parsed.data.name,
                    ...(parsed.data.description != null && { description: parsed.data.description }),
                    state: parsed.data.state,
                    board_kind: parsed.data.board_kind,
                    updated_at: parsed.data.updated_at,
                    ...(parsed.data.workspace_id != null && { workspace_id: parsed.data.workspace_id }),
                    url: parsed.data.url
                };
            });

            if (boards.length > 0) {
                await nango.batchSave(boards, 'Board');
            }
        }

        await nango.trackDeletesEnd('Board');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
