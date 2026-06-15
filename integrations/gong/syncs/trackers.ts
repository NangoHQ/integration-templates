import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TrackerSchema = z.object({
    id: z.string(),
    trackerId: z.string(),
    trackerName: z.string().optional(),
    workspaceId: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    affiliation: z.string().optional(),
    partOfQuestion: z.boolean().optional(),
    saidAt: z.string().optional(),
    filterQuery: z.string().optional()
});

const sync = createSync({
    description: 'Sync keyword trackers from Gong.',
    version: '1.0.0',
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
        await nango.trackDeletesStart('Tracker');

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

        for await (const page of nango.paginate(proxyConfig)) {
            const trackers = page.map((record: unknown) => {
                const raw = z
                    .object({
                        trackerId: z.string(),
                        trackerName: z.string().optional(),
                        workspaceId: z.string().optional(),
                        created: z.string().optional(),
                        updated: z.string().optional(),
                        affiliation: z.string().optional(),
                        partOfQuestion: z.boolean().optional(),
                        saidAt: z.string().optional(),
                        filterQuery: z.string().optional()
                    })
                    .safeParse(record);

                if (!raw.success) {
                    throw new Error(`Invalid tracker record: ${JSON.stringify(raw.error.issues)}`);
                }

                return {
                    id: raw.data.trackerId,
                    trackerId: raw.data.trackerId,
                    ...(raw.data.trackerName != null && { trackerName: raw.data.trackerName }),
                    ...(raw.data.workspaceId != null && { workspaceId: raw.data.workspaceId }),
                    ...(raw.data.created != null && { created: raw.data.created }),
                    ...(raw.data.updated != null && { updated: raw.data.updated }),
                    ...(raw.data.affiliation != null && { affiliation: raw.data.affiliation }),
                    ...(raw.data.partOfQuestion != null && { partOfQuestion: raw.data.partOfQuestion }),
                    ...(raw.data.saidAt != null && { saidAt: raw.data.saidAt }),
                    ...(raw.data.filterQuery != null && { filterQuery: raw.data.filterQuery })
                };
            });

            if (trackers.length > 0) {
                await nango.batchSave(trackers, 'Tracker');
            }
        }

        await nango.trackDeletesEnd('Tracker');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
