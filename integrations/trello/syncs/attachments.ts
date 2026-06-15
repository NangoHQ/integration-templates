import { createSync } from 'nango';
import { z } from 'zod';

const AttachmentSchema = z.object({
    id: z.string(),
    bytes: z.string().optional(),
    date: z.string().optional(),
    edgeColor: z.string().optional(),
    idMember: z.string().optional(),
    isUpload: z.boolean().optional(),
    mimeType: z.string().optional(),
    name: z.string().optional(),
    url: z.string().optional(),
    pos: z.number().optional(),
    idCard: z.string().optional(),
    idBoard: z.string().optional()
});

const BoardSchema = z.object({
    id: z.string()
});

const CardSchema = z.object({
    id: z.string()
});

const RawAttachmentSchema = z.array(
    z.object({
        id: z.string(),
        bytes: z.union([z.string(), z.number()]).optional().nullable(),
        date: z.string().optional().nullable(),
        edgeColor: z.string().optional().nullable(),
        idMember: z.string().optional().nullable(),
        isUpload: z.boolean().optional().nullable(),
        mimeType: z.string().optional().nullable(),
        name: z.string().optional().nullable(),
        url: z.string().optional().nullable(),
        pos: z.number().optional().nullable()
    })
);

const CheckpointSchema = z.object({
    board_id: z.string(),
    card_id: z.string(),
    resume_from_card: z.boolean()
});

const sync = createSync({
    description: 'Sync attachments from Trello cards.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Attachment: AttachmentSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/attachments'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : null;
        const wasTrackingDeletes = !checkpoint;

        if (wasTrackingDeletes) {
            await nango.trackDeletesStart('Attachment');
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

            // https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-cards-get
            const cardsResponse = await nango.get({
                endpoint: `/1/boards/${encodeURIComponent(board.id)}/cards`,
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

                // https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-attachments-get
                const attachmentsResponse = await nango.get({
                    endpoint: `/1/cards/${encodeURIComponent(card.id)}/attachments`,
                    retries: 3
                });

                const rawAttachments = RawAttachmentSchema.parse(attachmentsResponse.data);

                const attachments = rawAttachments.map((attachment) => ({
                    id: attachment.id,
                    ...(attachment.bytes != null && { bytes: String(attachment.bytes) }),
                    ...(attachment.date != null && { date: attachment.date }),
                    ...(attachment.edgeColor != null && { edgeColor: attachment.edgeColor }),
                    ...(attachment.idMember != null && { idMember: attachment.idMember }),
                    ...(attachment.isUpload != null && { isUpload: attachment.isUpload }),
                    ...(attachment.mimeType != null && { mimeType: attachment.mimeType }),
                    ...(attachment.name != null && { name: attachment.name }),
                    ...(attachment.url != null && { url: attachment.url }),
                    ...(attachment.pos != null && { pos: attachment.pos }),
                    idCard: card.id,
                    idBoard: board.id
                }));

                if (attachments.length > 0) {
                    await nango.batchSave(attachments, 'Attachment');
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
        }

        await nango.clearCheckpoint();
        if (wasTrackingDeletes) {
            await nango.trackDeletesEnd('Attachment');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
