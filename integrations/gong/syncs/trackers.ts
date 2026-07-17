import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TrackerSchema = z.object({
    id: z.string(),
    trackerId: z.string().nullable(),
    trackerName: z.string().nullish(),
    workspaceId: z.string().nullish(),
    created: z.string().nullish(),
    updated: z.string().nullish(),
    affiliation: z.string().nullish(),
    partOfQuestion: z.boolean().nullish(),
    saidAt: z.string().nullish(),
    filterQuery: z.string().nullish()
});

const sync = createSync({
    description: 'Sync keyword trackers from Gong.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Tracker: TrackerSchema
    },
    // https://help.gong.io/docs/what-the-gong-api-provides
    endpoints: [
        {
            path: '/syncs/trackers',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Blocker: GET /v2/settings/trackers does not support a changed-since filter,
        // so every run walks the full dataset to detect deletions.
        const proxyConfig: ProxyConfiguration = {
            // https://help.gong.io/docs/what-the-gong-api-provides
            endpoint: '/v2/settings/trackers',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'cursor',
                response_path: 'keywordTrackers'
            },
            retries: 3
        };

        const allTrackers: z.infer<typeof TrackerSchema>[] = [];

        for await (const page of nango.paginate(proxyConfig)) {
            const trackers = page.map((record: unknown) => {
                const raw = z
                    .object({
                        trackerId: z.string().nullable(),
                        trackerName: z.string().nullish(),
                        workspaceId: z.string().nullish(),
                        created: z.string().nullish(),
                        updated: z.string().nullish(),
                        affiliation: z.string().nullish(),
                        partOfQuestion: z.boolean().nullish(),
                        saidAt: z.string().nullish(),
                        filterQuery: z.string().nullish()
                    })
                    .safeParse(record);

                if (!raw.success) {
                    throw new Error(`Invalid tracker record: ${JSON.stringify(raw.error.issues)}`);
                }

                if (!raw.data.trackerId) {
                    throw new Error('Expected trackerId to be non-null');
                }

                return {
                    id: raw.data.trackerId,
                    trackerId: raw.data.trackerId,
                    ...(raw.data.trackerName !== undefined && { trackerName: raw.data.trackerName }),
                    ...(raw.data.workspaceId !== undefined && { workspaceId: raw.data.workspaceId }),
                    ...(raw.data.created !== undefined && { created: raw.data.created }),
                    ...(raw.data.updated !== undefined && { updated: raw.data.updated }),
                    ...(raw.data.affiliation !== undefined && { affiliation: raw.data.affiliation }),
                    ...(raw.data.partOfQuestion !== undefined && { partOfQuestion: raw.data.partOfQuestion }),
                    ...(raw.data.saidAt !== undefined && { saidAt: raw.data.saidAt }),
                    ...(raw.data.filterQuery !== undefined && { filterQuery: raw.data.filterQuery })
                };
            });

            allTrackers.push(...trackers);
        }

        await nango.trackDeletesStart('Tracker');

        if (allTrackers.length > 0) {
            await nango.batchSave(allTrackers, 'Tracker');
        }

        await nango.trackDeletesEnd('Tracker');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
