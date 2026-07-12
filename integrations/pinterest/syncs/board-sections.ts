import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const BoardResponseSchema = z.object({
    id: z.string()
});

const SectionResponseSchema = z.object({
    id: z.string(),
    name: z.string()
});

const BoardSectionSchema = z.object({
    id: z.string(),
    name: z.string(),
    board_id: z.string()
});

const sync = createSync({
    description: 'Sync sections for every board.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        BoardSection: BoardSectionSchema
    },

    exec: async (nango) => {
        // Blocker: GET /v5/boards/{board_id}/sections does not expose an updated-since
        // filter, a changed-records endpoint, or a resumable cursor beyond the per-request
        // bookmark. We must crawl every board fully and use full-refresh delete tracking.
        await nango.trackDeletesStart('BoardSection');

        const boardsProxyConfig: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/boards-list/
            endpoint: '/v5/boards',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'bookmark',
                cursor_path_in_response: 'bookmark',
                response_path: 'items',
                limit_name_in_request: 'page_size',
                limit: 100
            },
            retries: 3
        };

        for await (const boardsPage of nango.paginate(boardsProxyConfig)) {
            const boards = boardsPage.map((rawBoard: unknown) => {
                const boardResult = BoardResponseSchema.safeParse(rawBoard);
                if (!boardResult.success) {
                    throw new Error(`Invalid board record: ${boardResult.error.message}`);
                }
                return boardResult.data;
            });

            for (const board of boards) {
                const sectionsProxyConfig: ProxyConfiguration = {
                    // https://developers.pinterest.com/docs/api/v5/board_sections-list/
                    endpoint: `/v5/boards/${encodeURIComponent(board.id)}/sections`,
                    paginate: {
                        type: 'cursor',
                        cursor_name_in_request: 'bookmark',
                        cursor_path_in_response: 'bookmark',
                        response_path: 'items',
                        limit_name_in_request: 'page_size',
                        limit: 100
                    },
                    retries: 3
                };

                for await (const sectionsPage of nango.paginate(sectionsProxyConfig)) {
                    const sections = sectionsPage.map((rawSection: unknown) => {
                        const sectionResult = SectionResponseSchema.safeParse(rawSection);
                        if (!sectionResult.success) {
                            throw new Error(`Invalid section record: ${sectionResult.error.message}`);
                        }

                        return {
                            id: sectionResult.data.id,
                            name: sectionResult.data.name,
                            board_id: board.id
                        };
                    });

                    if (sections.length > 0) {
                        await nango.batchSave(sections, 'BoardSection');
                    }
                }
            }
        }

        await nango.trackDeletesEnd('BoardSection');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
