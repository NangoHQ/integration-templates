import { createSync } from 'nango';
import { z } from 'zod';

const LabelSchema = z.object({
    id: z.string(),
    idBoard: z.string(),
    name: z.string().optional(),
    color: z.string().optional(),
    uses: z.number().optional()
});

const BoardSchema = z.object({
    id: z.string()
});

const CheckpointSchema = z.object({
    board_id: z.string()
});

const sync = createSync({
    description: 'Sync labels from Trello boards.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Label: LabelSchema
    },
    endpoints: [
        {
            path: '/syncs/labels',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Blocker: Trello GET /1/boards/{id}/labels does not support time-based
        // filtering or deletion feeds. We keep a full refresh and checkpoint the
        // board walk so long runs can resume safely.
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : null;

        if (!checkpoint) {
            await nango.trackDeletesStart('Label');
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

            // https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-labels-get
            const labelsResponse = await nango.get({
                endpoint: `/1/boards/${encodeURIComponent(board.id)}/labels`,
                params: {
                    limit: 1000
                },
                retries: 3
            });

            const labels = z.array(LabelSchema).parse(labelsResponse.data);
            if (labels.length > 0) {
                await nango.batchSave(labels, 'Label');
            }

            const nextBoard = boards[boardIndex + 1];
            if (nextBoard) {
                await nango.saveCheckpoint({ board_id: nextBoard.id });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Label');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
