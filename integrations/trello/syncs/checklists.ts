import { createSync } from 'nango';
import { z } from 'zod';

const CheckItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    state: z.string().optional(),
    pos: z.number().optional(),
    idChecklist: z.string().optional()
});

const ChecklistSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    idBoard: z.string().optional(),
    idCard: z.string().optional(),
    pos: z.number().optional(),
    checkItems: z.array(CheckItemSchema).optional()
});

const BoardSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const CardSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const CheckpointSchema = z.object({
    board_id: z.string(),
    card_id: z.string(),
    resume_from_card: z.boolean()
});

const sync = createSync({
    description: 'Sync checklists (with their items) from Trello cards',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Checklist: ChecklistSchema
    },
    endpoints: [
        {
            path: '/syncs/checklists',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Full refresh: Trello /1/cards/{id}/checklists does not support
        // modified_since or updated_after filters, so we keep full deletion
        // tracking and only checkpoint the board/card traversal for resume.
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : null;

        if (!checkpoint) {
            await nango.trackDeletesStart('Checklist');
        }

        // https://developer.atlassian.com/cloud/trello/rest/api-group-members/#api-members-id-boards-get
        const boardsResponse = await nango.get({
            endpoint: '/1/members/me/boards',
            params: {
                fields: 'id,name'
            },
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

            // @allowTryCatch Board may have been deleted since the board list was fetched.
            try {
                // https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-cards-get
                const cardsResponse = await nango.get({
                    endpoint: `/1/boards/${encodeURIComponent(board.id)}/cards`,
                    params: {
                        fields: 'id,name'
                    },
                    retries: 3
                });

                const cards = z
                    .array(CardSchema)
                    .parse(cardsResponse.data)
                    .sort((a, b) => a.id.localeCompare(b.id));
                const startCardIndex =
                    checkpoint?.board_id === board.id && checkpoint.resume_from_card
                        ? Math.max(
                              cards.findIndex((card) => card.id === checkpoint.card_id),
                              0
                          )
                        : 0;

                for (let cardIndex = startCardIndex; cardIndex < cards.length; cardIndex++) {
                    const card = cards[cardIndex]!;

                    // https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-checklists-get
                    const checklistsResponse = await nango.get({
                        endpoint: `/1/cards/${encodeURIComponent(card.id)}/checklists`,
                        params: {
                            checkItems: 'all'
                        },
                        retries: 3
                    });

                    const checklistsResult = z.array(ChecklistSchema).safeParse(checklistsResponse.data);
                    if (!checklistsResult.success) {
                        throw new Error(`Invalid checklists response: ${checklistsResult.error.message}`);
                    }

                    if (checklistsResult.data.length > 0) {
                        await nango.batchSave(checklistsResult.data, 'Checklist');
                    }

                    const nextCard = cards[cardIndex + 1];
                    if (nextCard) {
                        await nango.saveCheckpoint({ board_id: board.id, card_id: nextCard.id, resume_from_card: true });
                    } else {
                        const nextBoard = boards[boardIndex + 1];
                        if (nextBoard) {
                            await nango.saveCheckpoint({ board_id: nextBoard.id, card_id: '', resume_from_card: false });
                        }
                    }
                }

                if (cards.length === 0) {
                    const nextBoard = boards[boardIndex + 1];
                    if (nextBoard) {
                        await nango.saveCheckpoint({ board_id: nextBoard.id, card_id: '', resume_from_card: false });
                    }
                }
            } catch (err) {
                if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
                    const nextBoard = boards[boardIndex + 1];
                    if (nextBoard) {
                        await nango.saveCheckpoint({ board_id: nextBoard.id, card_id: '', resume_from_card: false });
                    }
                    continue;
                }
                throw err;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Checklist');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
