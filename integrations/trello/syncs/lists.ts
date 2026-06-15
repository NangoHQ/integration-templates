import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const BoardSchema = z.object({
    id: z.string()
});

const TrelloListSchema = z.object({
    id: z.string(),
    name: z.string(),
    closed: z.boolean().nullish(),
    pos: z.number().nullish(),
    idBoard: z.string(),
    subscribed: z.boolean().nullish()
});

const ListSchema = z.object({
    id: z.string(),
    name: z.string(),
    closed: z.boolean().optional(),
    pos: z.number().optional(),
    idBoard: z.string(),
    subscribed: z.boolean().optional()
});

const CheckpointSchema = z.object({
    board_id: z.string()
});

const sync = createSync({
    description: 'Sync lists from Trello boards',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        List: ListSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/lists'
        }
    ],

    exec: async (nango) => {
        // Blocker: Trello's GET /1/boards/{id}/lists endpoint does not support
        // any date-based, cursor-based, or offset-based incremental filtering.
        // There is no since, updated_after, or cursor parameter. The endpoint
        // always returns all lists for a board. We keep a full refresh and use
        // a checkpoint only to resume the board traversal after interruptions.
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : null;

        if (!checkpoint) {
            await nango.trackDeletesStart('List');
        }

        // https://developer.atlassian.com/cloud/trello/rest/api-group-members/#api-members-id-boards-get
        const boardsResponse = await nango.get({
            endpoint: '/1/members/me/boards',
            retries: 3
        });

        const boards = z
            .array(BoardSchema)
            .parse(boardsResponse.data)
            .sort((a, b) => a.id.localeCompare(b.id));
        const startBoardIndex = checkpoint
            ? Math.max(
                  boards.findIndex((board) => board.id === checkpoint.board_id),
                  0
              )
            : 0;

        for (let boardIndex = startBoardIndex; boardIndex < boards.length; boardIndex++) {
            const board = boards[boardIndex]!;

            const listsProxyConfig: ProxyConfiguration = {
                // https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-lists-get
                endpoint: `/1/boards/${encodeURIComponent(board.id)}/lists`,
                params: {
                    filter: 'all'
                },
                retries: 3
            };

            const listsResponse = await nango.get(listsProxyConfig);
            const rawLists = z.array(TrelloListSchema).parse(listsResponse.data);
            const lists = rawLists.map((list) => ({
                id: list.id,
                name: list.name,
                ...(list.closed != null && { closed: list.closed }),
                ...(list.pos != null && { pos: list.pos }),
                idBoard: list.idBoard,
                ...(list.subscribed != null && { subscribed: list.subscribed })
            }));

            if (lists.length > 0) {
                await nango.batchSave(lists, 'List');
            }

            const nextBoard = boards[boardIndex + 1];
            if (nextBoard) {
                await nango.saveCheckpoint({ board_id: nextBoard.id });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('List');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
