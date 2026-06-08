import { createSync } from 'nango';
import { z } from 'zod';

const TrelloBoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    desc: z.string().nullable().optional(),
    closed: z.boolean(),
    idOrganization: z.string().nullable().optional(),
    url: z.string(),
    shortUrl: z.string(),
    dateLastActivity: z.string().nullable().optional(),
    dateLastView: z.string().nullable().optional(),
    pinned: z.boolean().optional(),
    subscribed: z.boolean().optional(),
    idMemberCreator: z.string().nullable().optional(),
    starred: z.boolean().optional(),
    shortLink: z.string().nullable().optional()
});

const BoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    desc: z.string().optional(),
    closed: z.boolean(),
    idOrganization: z.string().optional(),
    url: z.string(),
    shortUrl: z.string(),
    dateLastActivity: z.string().optional(),
    dateLastView: z.string().optional(),
    pinned: z.boolean().optional(),
    subscribed: z.boolean().optional(),
    idMemberCreator: z.string().optional(),
    starred: z.boolean().optional(),
    shortLink: z.string().optional()
});

const CheckpointSchema = z.object({
    date_last_activity: z.string()
});

const sync = createSync({
    description: 'Sync boards from Trello.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Board: BoardSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/boards'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        const dateLastActivityCheckpoint = parsedCheckpoint.success ? parsedCheckpoint.data.date_last_activity : undefined;

        // https://developer.atlassian.com/cloud/trello/rest/api-group-members/#api-members-id-boards-get
        const proxyConfig = {
            endpoint: '/1/members/me/boards',
            params: {
                filter: 'all'
            },
            retries: 3
        };

        const response = await nango.get(proxyConfig);

        const parseResult = TrelloBoardSchema.array().safeParse(response.data);
        if (!parseResult.success) {
            throw new Error(`Failed to parse boards response: ${parseResult.error.message}`);
        }

        const allBoards = parseResult.data;
        const filteredBoards = dateLastActivityCheckpoint
            ? allBoards.filter((board) => {
                  const boardDate = board.dateLastActivity;
                  return boardDate != null && boardDate > dateLastActivityCheckpoint;
              })
            : allBoards;

        const boards = filteredBoards.map((board) => ({
            id: board.id,
            name: board.name,
            ...(board.desc != null && { desc: board.desc }),
            closed: board.closed,
            ...(board.idOrganization != null && { idOrganization: board.idOrganization }),
            url: board.url,
            shortUrl: board.shortUrl,
            ...(board.dateLastActivity != null && { dateLastActivity: board.dateLastActivity }),
            ...(board.dateLastView != null && { dateLastView: board.dateLastView }),
            ...(board.pinned != null && { pinned: board.pinned }),
            ...(board.subscribed != null && { subscribed: board.subscribed }),
            ...(board.idMemberCreator != null && { idMemberCreator: board.idMemberCreator }),
            ...(board.starred != null && { starred: board.starred }),
            ...(board.shortLink != null && { shortLink: board.shortLink })
        }));

        if (boards.length > 0) {
            await nango.batchSave(boards, 'Board');
        }

        let maxDate: string | undefined;
        for (const board of allBoards) {
            const boardDate = board.dateLastActivity;
            if (boardDate != null && (maxDate === undefined || boardDate > maxDate)) {
                maxDate = boardDate;
            }
        }

        if (maxDate) {
            await nango.saveCheckpoint({ date_last_activity: maxDate });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
