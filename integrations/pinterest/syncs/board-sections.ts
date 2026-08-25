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

const BoardsResponseSchema = z.object({
    items: z.array(z.unknown()),
    bookmark: z.string().nullable().optional()
});

const SectionsResponseSchema = z.object({
    items: z.array(z.unknown()),
    bookmark: z.string().nullable().optional()
});

const CheckpointSchema = z.object({
    board_bookmark: z.string(),
    current_board_id: z.string(),
    section_bookmark: z.string()
});

const sync = createSync({
    description: 'Sync sections for every board.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        BoardSection: BoardSectionSchema
    },

    exec: async (nango) => {
        // Blocker: GET /v5/boards/{board_id}/sections does not expose an updated-since
        // filter, a changed-records endpoint, or a resumable cursor beyond the per-request
        // bookmark. We must crawl every board fully and use full-refresh delete tracking.
        // The checkpoint records the outer board page bookmark, the current board id, and
        // the inner sections page bookmark so a run that exceeds the execution window can
        // resume without re-processing completed boards or sections.
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint ?? { board_bookmark: '', current_board_id: '', section_bookmark: '' });
        if (!checkpointResult.success) {
            throw new Error(`Invalid checkpoint: ${checkpointResult.error.message}`);
        }
        const checkpoint = checkpointResult.data;

        let boardBookmark = checkpoint.board_bookmark !== '' ? checkpoint.board_bookmark : undefined;
        let currentBoardId = checkpoint.current_board_id !== '' ? checkpoint.current_board_id : undefined;
        let sectionBookmark = checkpoint.section_bookmark !== '' ? checkpoint.section_bookmark : undefined;

        await nango.trackDeletesStart('BoardSection');

        while (true) {
            const boardsProxyConfig: ProxyConfiguration = {
                // https://developers.pinterest.com/docs/api/v5/boards-list/
                endpoint: '/v5/boards',
                params: {
                    page_size: 100,
                    ...(boardBookmark && { bookmark: boardBookmark })
                },
                retries: 3
            };

            const boardsResponse = await nango.get(boardsProxyConfig);
            const parsedBoards = BoardsResponseSchema.safeParse(boardsResponse.data);
            if (!parsedBoards.success) {
                throw new Error(`Invalid boards response: ${parsedBoards.error.message}`);
            }

            const boards = parsedBoards.data.items.map((rawBoard: unknown) => {
                const boardResult = BoardResponseSchema.safeParse(rawBoard);
                if (!boardResult.success) {
                    throw new Error(`Invalid board record: ${boardResult.error.message}`);
                }
                return boardResult.data;
            });

            const nextBoardBookmark = parsedBoards.data.bookmark ?? undefined;

            // Determine resume position within this page
            let startIndex = 0;
            if (currentBoardId) {
                const foundIndex = boards.findIndex((board) => board.id === currentBoardId);
                if (foundIndex >= 0) {
                    startIndex = foundIndex;
                } else {
                    // Resumed board no longer exists; process all boards on this page
                    currentBoardId = undefined;
                    sectionBookmark = undefined;
                }
            }

            for (let i = startIndex; i < boards.length; i++) {
                const board = boards[i];
                if (!board) {
                    continue;
                }

                let innerBookmark: string | undefined = sectionBookmark;
                sectionBookmark = undefined;
                currentBoardId = board.id;

                while (true) {
                    const sectionsProxyConfig: ProxyConfiguration = {
                        // https://developers.pinterest.com/docs/api/v5/board_sections-list/
                        endpoint: `/v5/boards/${encodeURIComponent(board.id)}/sections`,
                        params: {
                            page_size: 100,
                            ...(innerBookmark && { bookmark: innerBookmark })
                        },
                        retries: 3
                    };

                    const sectionsResponse = await nango.get(sectionsProxyConfig);
                    const parsedSections = SectionsResponseSchema.safeParse(sectionsResponse.data);
                    if (!parsedSections.success) {
                        throw new Error(`Invalid sections response: ${parsedSections.error.message}`);
                    }

                    const sections = parsedSections.data.items.map((rawSection: unknown) => {
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

                    const nextSectionBookmark = parsedSections.data.bookmark ?? undefined;

                    await nango.saveCheckpoint({
                        board_bookmark: boardBookmark ?? '',
                        current_board_id: board.id,
                        section_bookmark: nextSectionBookmark ?? ''
                    });

                    if (!nextSectionBookmark) {
                        break;
                    }
                    innerBookmark = nextSectionBookmark;
                }

                currentBoardId = undefined;
                sectionBookmark = undefined;
            }

            if (!nextBoardBookmark) {
                break;
            }

            boardBookmark = nextBoardBookmark;
            await nango.saveCheckpoint({
                board_bookmark: boardBookmark,
                current_board_id: '',
                section_bookmark: ''
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('BoardSection');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
