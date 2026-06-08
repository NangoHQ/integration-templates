import { createSync } from 'nango';
import { z } from 'zod';

const MemberSchema = z.object({
    id: z.string(),
    fullName: z.string().optional(),
    username: z.string().optional(),
    email: z.string().optional(),
    avatarUrl: z.string().optional(),
    initials: z.string().optional(),
    url: z.string().optional()
});

const BoardSchema = z.object({
    id: z.string()
});

const CheckpointSchema = z.object({
    board_id: z.string()
});

const sync = createSync({
    description: 'Sync members from Trello boards.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'GET', path: '/syncs/members' }],
    models: {
        Member: MemberSchema
    },

    exec: async (nango) => {
        // Blocker: Trello member endpoints do not support changed-since filtering,
        // deleted-record endpoints, or resumable cursors. We keep a full
        // refresh and only checkpoint the board traversal for resume support.
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : null;

        if (!checkpoint) {
            await nango.trackDeletesStart('Member');
        }

        // https://developer.atlassian.com/cloud/trello/rest/api-group-members/#api-members-me-boards-get
        // Note: the Trello boards endpoint does not support pagination; it returns all boards in a single request.
        const boardsResponse = await nango.get({
            endpoint: '/1/members/me/boards',
            params: {
                fields: 'id'
            },
            retries: 3
        });

        const rawBoards = Array.isArray(boardsResponse.data) ? boardsResponse.data : [];
        const boards = rawBoards
            .map((rawBoard) => {
                const boardResult = BoardSchema.safeParse(rawBoard);
                if (!boardResult.success) {
                    throw new Error(`Failed to parse board: ${boardResult.error.message}`);
                }
                return boardResult.data;
            })
            .sort((a, b) => a.id.localeCompare(b.id));

        const startBoardIndex = checkpoint
            ? Math.max(
                  boards.findIndex((board) => board.id === checkpoint.board_id),
                  0
              )
            : 0;

        for (let boardIndex = startBoardIndex; boardIndex < boards.length; boardIndex++) {
            const boardId = boards[boardIndex]!.id;

            // https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-members-get
            // Note: the Trello board members endpoint does not support pagination.
            const membersResponse = await nango.get({
                endpoint: `/1/boards/${encodeURIComponent(boardId)}/members`,
                retries: 3
            });

            const rawMembers = Array.isArray(membersResponse.data) ? membersResponse.data : [];
            const members: z.infer<typeof MemberSchema>[] = [];

            for (const rawMember of rawMembers) {
                const memberResult = MemberSchema.safeParse(rawMember);
                if (!memberResult.success) {
                    throw new Error(`Failed to parse member: ${memberResult.error.message}`);
                }
                members.push(memberResult.data);
            }

            if (members.length > 0) {
                await nango.batchSave(members, 'Member');
            }

            const nextBoard = boards[boardIndex + 1];
            if (nextBoard) {
                await nango.saveCheckpoint({ board_id: nextBoard.id });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Member');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
