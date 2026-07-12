import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const EpicSchema = z
    .object({
        id: z.number().int(),
        name: z.string(),
        created_at: z.string(),
        updated_at: z.string()
    })
    .passthrough();

const EpicModelSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const CheckpointSchema = z.object({}).catchall(z.union([z.string(), z.number(), z.boolean()]));

const sync = createSync({
    description: 'Sync epics.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Epic: EpicModelSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? {});
        const updatedAfter = typeof checkpoint['updated_after'] === 'string' ? checkpoint['updated_after'] : undefined;
        const isFullCrawl = !updatedAfter;

        let maxUpdatedAt: string | undefined;

        if (isFullCrawl) {
            // https://developer.shortcut.com/api/rest/v3#Get-Epics
            const response = await nango.get({
                endpoint: '/api/v3/epics',
                retries: 3
            });

            const parsed = z.array(EpicSchema).safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse epics response: ${parsed.error.message}`);
            }

            await nango.trackDeletesStart('Epic');

            const epics = parsed.data;
            if (epics.length > 0) {
                const records = epics.map((epic) => {
                    const { id, ...rest } = epic;
                    return {
                        id: String(id),
                        ...rest
                    };
                });

                await nango.batchSave(records, 'Epic');

                for (const record of records) {
                    if (maxUpdatedAt === undefined || record.updated_at > maxUpdatedAt) {
                        maxUpdatedAt = record.updated_at;
                    }
                }
            }
        } else {
            // Incremental fetch via search endpoint using updated: operator.
            const updatedDate = updatedAfter.slice(0, 10);
            const proxyConfig: ProxyConfiguration = {
                // https://developer.shortcut.com/api/rest/v3#Search-Epics
                endpoint: '/api/v3/search/epics',
                params: {
                    query: `type:epic updated:${updatedDate}..*`,
                    page_size: 250
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'next',
                    cursor_path_in_response: 'next'
                },
                retries: 3
            };

            for await (const page of nango.paginate(proxyConfig)) {
                let rawEpics: unknown[];
                if (Array.isArray(page)) {
                    rawEpics = page;
                } else if (page && typeof page === 'object') {
                    const envelope = z
                        .object({
                            data: z.array(z.unknown()),
                            next: z.string().optional()
                        })
                        .parse(page);
                    rawEpics = envelope.data;
                } else {
                    throw new Error('Unexpected response format from epic search');
                }

                if (rawEpics.length === 0) {
                    continue;
                }

                const epics = rawEpics.map((item) => {
                    const epic = EpicSchema.parse(item);
                    const { id, ...rest } = epic;
                    return {
                        id: String(id),
                        ...rest
                    };
                });

                await nango.batchSave(epics, 'Epic');

                for (const epic of epics) {
                    if (maxUpdatedAt === undefined || epic.updated_at > maxUpdatedAt) {
                        maxUpdatedAt = epic.updated_at;
                    }
                }
            }
        }

        if (isFullCrawl) {
            await nango.trackDeletesEnd('Epic');
        }

        // Incremental search filters by day (updated:D..*), which can re-return epics
        // updated earlier than `updatedAfter`. Never let the checkpoint regress.
        let nextCheckpoint: string;
        if (isFullCrawl) {
            nextCheckpoint = maxUpdatedAt ?? new Date().toISOString();
        } else {
            nextCheckpoint = maxUpdatedAt && maxUpdatedAt > updatedAfter! ? maxUpdatedAt : updatedAfter!;
        }
        await nango.saveCheckpoint({ updated_after: nextCheckpoint });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
