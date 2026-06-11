import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const BoardSchema = z.object({
    id: z.string().describe('Trello board ID')
});

const RawCardSchema = z.object({
    id: z.string().describe('Trello card ID'),
    name: z.string().describe('Card name'),
    desc: z.string().nullable().optional().describe('Card description'),
    closed: z.boolean().describe('Whether the card is closed or archived'),
    dateLastActivity: z.string().describe('ISO 8601 timestamp of last activity'),
    due: z.string().nullable().optional().describe('ISO 8601 due date'),
    dueComplete: z.boolean().optional().describe('Whether the due date is complete'),
    idBoard: z.string().describe('ID of the board the card belongs to'),
    idList: z.string().describe('ID of the list the card belongs to'),
    idMembers: z.array(z.string()).optional().describe('Member IDs assigned to the card'),
    idLabels: z.array(z.string()).optional().describe('Label IDs on the card'),
    idChecklists: z.array(z.string()).optional().describe('Checklist IDs on the card'),
    pos: z.number().describe('Position of the card in the list'),
    shortLink: z.string().describe('Short link identifier'),
    shortUrl: z.string().describe('Short URL'),
    url: z.string().describe('Full URL'),
    subscribed: z.boolean().optional().describe('Whether the current user is subscribed')
});

const CardSchema = z.object({
    id: z.string().describe('Trello card ID'),
    name: z.string().describe('Card name'),
    desc: z.string().optional().describe('Card description'),
    closed: z.boolean().describe('Whether the card is closed or archived'),
    dateLastActivity: z.string().describe('ISO 8601 timestamp of last activity'),
    due: z.string().optional().describe('ISO 8601 due date'),
    dueComplete: z.boolean().optional().describe('Whether the due date is complete'),
    idBoard: z.string().describe('ID of the board the card belongs to'),
    idList: z.string().describe('ID of the list the card belongs to'),
    idMembers: z.array(z.string()).optional().describe('Member IDs assigned to the card'),
    idLabels: z.array(z.string()).optional().describe('Label IDs on the card'),
    idChecklists: z.array(z.string()).optional().describe('Checklist IDs on the card'),
    pos: z.number().describe('Position of the card in the list'),
    shortLink: z.string().describe('Short link identifier'),
    shortUrl: z.string().describe('Short URL'),
    url: z.string().describe('Full URL'),
    subscribed: z.boolean().optional().describe('Whether the current user is subscribed')
});

const CheckpointSchema = z.object({
    updated_after: z.string().describe('ISO 8601 timestamp for incremental filtering')
});

const sync = createSync({
    description: 'Sync cards from Trello boards',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Card: CardSchema
    },
    // https://developer.atlassian.com/cloud/trello/rest/api-group-boards/
    endpoints: [
        {
            path: '/syncs/cards',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let updatedAfter: string | undefined;
        if (checkpoint != null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (!parsedCheckpoint.success) {
                throw new Error('Invalid checkpoint: ' + parsedCheckpoint.error.message);
            }
            updatedAfter = parsedCheckpoint.data.updated_after;
        }

        // https://developer.atlassian.com/cloud/trello/rest/api-group-members/
        const boardsResponse = await nango.get({
            endpoint: '/1/members/me/boards',
            retries: 3
        });

        const boardsResult = z.array(BoardSchema).safeParse(boardsResponse.data);
        if (!boardsResult.success) {
            throw new Error('Failed to parse boards response: ' + boardsResult.error.message);
        }

        let maxDateLastActivity: string | undefined;

        for (const board of boardsResult.data) {
            const cardsConfig: ProxyConfiguration = {
                // https://developer.atlassian.com/cloud/trello/rest/api-group-boards/
                endpoint: `/1/boards/${encodeURIComponent(board.id)}/cards`,
                params: {
                    filter: 'all'
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'limit',
                    limit: 100
                },
                retries: 3
            };

            for await (const page of nango.paginate(cardsConfig)) {
                const cardsResult = z.array(RawCardSchema).safeParse(page);
                if (!cardsResult.success) {
                    throw new Error('Failed to parse cards response: ' + cardsResult.error.message);
                }

                const cards = cardsResult.data
                    .filter((card) => {
                        if (!updatedAfter) {
                            return true;
                        }
                        return card.dateLastActivity > updatedAfter;
                    })
                    .map((card) => ({
                        id: card.id,
                        name: card.name,
                        ...(card.desc != null && { desc: card.desc }),
                        closed: card.closed,
                        dateLastActivity: card.dateLastActivity,
                        ...(card.due != null && { due: card.due }),
                        ...(card.dueComplete != null && { dueComplete: card.dueComplete }),
                        idBoard: card.idBoard,
                        idList: card.idList,
                        ...(card.idMembers && { idMembers: card.idMembers }),
                        ...(card.idLabels && { idLabels: card.idLabels }),
                        ...(card.idChecklists && { idChecklists: card.idChecklists }),
                        pos: card.pos,
                        shortLink: card.shortLink,
                        shortUrl: card.shortUrl,
                        url: card.url,
                        ...(card.subscribed != null && { subscribed: card.subscribed })
                    }));

                if (cards.length > 0) {
                    await nango.batchSave(cards, 'Card');
                }

                for (const card of cardsResult.data) {
                    if (maxDateLastActivity === undefined || card.dateLastActivity > maxDateLastActivity) {
                        maxDateLastActivity = card.dateLastActivity;
                    }
                }
            }
        }

        if (maxDateLastActivity !== undefined) {
            await nango.saveCheckpoint({
                updated_after: maxDateLastActivity
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
