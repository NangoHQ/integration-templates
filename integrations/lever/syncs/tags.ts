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

const sync = createSync({
    description: 'Fetches all candidate/opportunity tags configured on the account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Tag: TagSchema
    },

    exec: async (nango) => {
        // Blocker: GET /v1/tags has no changed-since filter, no deleted-record endpoint,
        // and no resumable cursor that supports incremental change tracking.
        await nango.trackDeletesStart('Tag');

        const proxyConfig: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation
            endpoint: '/v1/tags',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
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

            if (tags.length > 0) {
                await nango.batchSave(tags, 'Tag');
            }
        }

        await nango.trackDeletesEnd('Tag');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
