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

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    keywordTrackers: z.array(z.unknown()).nullish(),
    cursor: z.string().nullish()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync keyword trackers from Gong.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
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
        const rawCheckpoint = await nango.getCheckpoint();
        let cursor: string | undefined;
        if (rawCheckpoint != null) {
            const parsed = CheckpointSchema.safeParse(rawCheckpoint);
            if (!parsed.success) {
                throw new Error(`Invalid checkpoint: ${JSON.stringify(parsed.error.issues)}`);
            }
            cursor = parsed.data.cursor;
        }

        await nango.trackDeletesStart('Tracker');

        while (true) {
            const proxyConfig: ProxyConfiguration = {
                // https://help.gong.io/docs/what-the-gong-api-provides
                endpoint: '/v2/settings/trackers',
                params: {
                    ...(cursor && { cursor })
                },
                retries: 3
            };

            const response = await nango.get(proxyConfig);
            const parsed = ProviderResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Invalid trackers response: ${JSON.stringify(parsed.error.issues)}`);
            }

            const trackers = (parsed.data.keywordTrackers ?? []).map((record: unknown) => {
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

            if (trackers.length > 0) {
                await nango.batchSave(trackers, 'Tracker');
            }

            const nextCursor = parsed.data.cursor;
            if (!nextCursor) {
                break;
            }

            cursor = nextCursor;
            await nango.saveCheckpoint({ cursor });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Tracker');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
