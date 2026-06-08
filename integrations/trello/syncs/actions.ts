import { createSync } from 'nango';
import { z } from 'zod';

const ActionSchema = z.object({
    id: z.string(),
    idMemberCreator: z.string().optional(),
    type: z.string().optional(),
    date: z.string(),
    data: z.record(z.string(), z.unknown()).nullish(),
    display: z.record(z.string(), z.unknown()).nullish(),
    memberCreator: z.record(z.string(), z.unknown()).nullish(),
    limits: z.record(z.string(), z.unknown()).nullish()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync activity actions (audit log) for Trello boards.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/actions' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Action: ActionSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;
        let latestDate: string | undefined;

        // https://developer.atlassian.com/cloud/trello/rest/api-group-members/
        const boardsResponse = await nango.get({
            endpoint: '/1/members/me/boards',
            params: {
                fields: 'id'
            },
            retries: 3
        });

        const boards = z
            .array(
                z.object({
                    id: z.string()
                })
            )
            .parse(boardsResponse.data);

        for (const board of boards) {
            let before: string | undefined;

            while (true) {
                const params: Record<string, string | number> = {
                    filter: 'all',
                    limit: 1000
                };

                if (updatedAfter) {
                    params['since'] = updatedAfter;
                }

                if (before) {
                    params['before'] = before;
                }

                // https://developer.atlassian.com/cloud/trello/rest/api-group-boards/
                const response = await nango.get({
                    endpoint: `/1/boards/${encodeURIComponent(board.id)}/actions`,
                    params,
                    retries: 3
                });

                const actions = z.array(ActionSchema).parse(response.data);

                if (actions.length === 0) {
                    break;
                }

                await nango.batchSave(actions, 'Action');

                const firstAction = actions[0];
                if (firstAction) {
                    const pageLatestDate = firstAction.date;
                    if (!latestDate || pageLatestDate > latestDate) {
                        latestDate = pageLatestDate;
                    }
                }

                if (actions.length < 1000) {
                    break;
                }

                const lastAction = actions[actions.length - 1];
                if (lastAction) {
                    before = lastAction.id;
                }
            }
        }

        if (latestDate) {
            await nango.saveCheckpoint({ updated_after: latestDate });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
