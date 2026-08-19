import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const SourceSchema = z.object({
    id: z.string(),
    text: z.string(),
    count: z.number().optional()
});

const CheckpointSchema = z.object({
    offset: z.string()
});

const ProviderSourceSchema = z.object({
    text: z.string(),
    count: z.number().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderSourceSchema),
    hasNext: z.boolean().optional(),
    next: z.string().optional()
});

const sync = createSync({
    description: 'Fetches all candidate sources configured on the account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Source: SourceSchema
    },

    exec: async (nango) => {
        // Blocker: GET /v1/sources returns a flat list of all sources with no
        // changed-since filter, no deleted-record endpoint, and no resumable cursor.
        // Each item only has text and count.
        const rawCheckpoint = await nango.getCheckpoint();

        let offset: string | undefined;
        if (rawCheckpoint != null) {
            const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
            if (!checkpointResult.success) {
                throw new Error(`Failed to parse checkpoint: ${checkpointResult.error.message}`);
            }
            offset = checkpointResult.data.offset;
        }

        await nango.trackDeletesStart('Source');

        while (true) {
            const proxyConfig: ProxyConfiguration = {
                // https://hire.lever.co/developer/documentation
                endpoint: '/v1/sources',
                params: {
                    limit: 100,
                    ...(offset && { offset })
                },
                retries: 3
            };

            const response = await nango.get(proxyConfig);

            const parsed = ProviderResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse sources response: ${parsed.error.message}`);
            }

            const sources = parsed.data.data.map((source) => ({
                id: source.text,
                text: source.text,
                count: source.count
            }));

            if (sources.length > 0) {
                await nango.batchSave(sources, 'Source');
            }

            if (parsed.data.hasNext === true && typeof parsed.data.next === 'string') {
                offset = parsed.data.next;
                await nango.saveCheckpoint({ offset });
                continue;
            }

            break;
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Source');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
