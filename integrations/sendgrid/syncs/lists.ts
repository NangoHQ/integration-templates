import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderListSchema = z.object({
    id: z.string(),
    name: z.string(),
    contact_count: z.number().optional(),
    _metadata: z
        .object({
            self: z.string()
        })
        .optional()
});

const ListSchema = z.object({
    id: z.string(),
    name: z.string(),
    contact_count: z.number().optional(),
    self_url: z.string().optional()
});

const sync = createSync({
    description: 'Sync lists.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        List: ListSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes /v3/marketing/lists with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor that can be used with delete tracking.
        await nango.trackDeletesStart('List');

        const proxyConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/sendgrid/api-reference/lists/get-all-lists
            endpoint: '/v3/marketing/lists',
            params: {
                page_size: 100
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: '_metadata.next',
                response_path: 'result',
                limit_name_in_request: 'page_size',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Unexpected non-array page from paginate');
            }

            const lists = page.map((record) => {
                const parsed = ProviderListSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse list: ${parsed.error.message}`);
                }

                const list = parsed.data;
                return {
                    id: list.id,
                    name: list.name,
                    ...(list.contact_count !== undefined && { contact_count: list.contact_count }),
                    ...(list._metadata?.self && { self_url: list._metadata.self })
                };
            });

            if (lists.length > 0) {
                await nango.batchSave(lists, 'List');
            }
        }

        await nango.trackDeletesEnd('List');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
