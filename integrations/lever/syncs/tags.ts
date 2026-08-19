import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TagSchema = z.object({
    id: z.string(),
    text: z.string(),
    count: z.number().int()
});

const ProviderTagSchema = z.object({
    text: z.string(),
    count: z.number().int()
});

const CheckpointSchema = z.object({
    offset: z.string()
});

const sync = createSync({
    description: 'Fetches all candidate/opportunity tags configured on the account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Tag: TagSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        let offset = checkpoint?.offset ?? '';

        // Blocker: GET /v1/tags has no changed-since filter, no deleted-record endpoint,
        // and no resumable cursor that supports incremental change tracking.
        await nango.trackDeletesStart('Tag');

        const LIMIT = 100;

        const proxyConfig: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation
            endpoint: '/v1/tags',
            params: {
                limit: LIMIT,
                ...(offset ? { offset } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: LIMIT,
                on_page: async ({ nextPageParam }) => {
                    offset = typeof nextPageParam === 'string' ? nextPageParam : '';
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const tags = z
                .array(ProviderTagSchema)
                .parse(page)
                .map((record) => ({
                    id: record.text,
                    text: record.text,
                    count: record.count
                }));

            await nango.batchSave(tags, 'Tag');
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Tag');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
