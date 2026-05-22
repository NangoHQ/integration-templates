import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ColumnSchema = z.object({
    id: z.string(),
    board_id: z.string(),
    column_id: z.string(),
    title: z.string(),
    type: z.string(),
    settings_str: z.string().optional()
});

const BoardSchema = z.object({
    id: z.string(),
    columns: z
        .array(
            z.object({
                id: z.string(),
                title: z.string(),
                type: z.string(),
                settings_str: z.string().optional()
            })
        )
        .optional()
});

const sync = createSync({
    description: 'Sync columns from monday.com',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Column: ColumnSchema
    },
    // https://developer.monday.com/api-reference/docs
    endpoints: [{ method: 'POST', path: '/syncs/columns' }],
    scopes: ['boards:read'],

    exec: async (nango) => {
        // Blocker: monday.com columns API does not expose updated_at, modified_since,
        // cursors, or any changed-records endpoint for columns. Columns are nested under
        // boards and must be fetched by walking all boards.
        // https://developer.monday.com/api-reference/docs
        await nango.trackDeletesStart('Column');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.monday.com/api-reference/docs
            endpoint: '/v2',
            method: 'POST',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query: `query ($limit: Int!, $page: Int!) {
                    boards(limit: $limit, page: $page) {
                        id
                        columns {
                            id
                            title
                            type
                            settings_str
                        }
                    }
                }`,
                variables: {
                    limit: 25,
                    page: 1
                }
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'variables.page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'variables.limit',
                limit: 25,
                response_path: 'data.boards'
            },
            retries: 3
        };

        for await (const boards of nango.paginate(proxyConfig)) {
            if (!Array.isArray(boards)) {
                throw new Error('Expected boards to be an array');
            }

            const columns: z.infer<typeof ColumnSchema>[] = [];

            for (const board of boards) {
                const parsedBoard = BoardSchema.safeParse(board);
                if (!parsedBoard.success) {
                    throw new Error(`Failed to parse board: ${parsedBoard.error.message}`);
                }

                const b = parsedBoard.data;
                for (const column of b.columns || []) {
                    columns.push({
                        id: `${b.id}_${column.id}`,
                        board_id: b.id,
                        column_id: column.id,
                        title: column.title,
                        type: column.type,
                        ...(column.settings_str != null && { settings_str: column.settings_str })
                    });
                }
            }

            if (columns.length > 0) {
                await nango.batchSave(columns, 'Column');
            }
        }

        await nango.trackDeletesEnd('Column');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
