import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const SourceSchema = z.object({
    id: z.string(),
    text: z.string(),
    count: z.number().optional()
});

const sync = createSync({
    description: 'Fetches all candidate sources configured on the account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Source: SourceSchema
    },

    exec: async (nango) => {
        // Blocker: GET /v1/sources returns a flat list of all sources with no
        // changed-since filter, no deleted-record endpoint, and no resumable cursor.
        // Each item only has text and count.
        await nango.trackDeletesStart('Source');

        const proxyConfig: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation
            endpoint: '/v1/sources',
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
            const validated = z
                .array(
                    z.object({
                        text: z.string(),
                        count: z.number().optional()
                    })
                )
                .safeParse(page);

            if (!validated.success) {
                throw new Error(`Failed to parse sources response: ${validated.error.message}`);
            }

            const sources = validated.data.map((source) => ({
                id: source.text,
                text: source.text,
                count: source.count
            }));

            if (sources.length > 0) {
                await nango.batchSave(sources, 'Source');
            }
        }

        await nango.trackDeletesEnd('Source');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
