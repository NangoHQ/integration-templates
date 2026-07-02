import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ListSchema = z.object({
    id: z.string().describe('The Klaviyo list ID, e.g. XW53Ha'),
    name: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional()
});

const KlaviyoListItemSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: z
        .object({
            name: z.string().optional().nullable(),
            created: z.string().optional().nullable(),
            updated: z.string().optional().nullable()
        })
        .optional()
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
        const proxyConfig: ProxyConfiguration = {
            // https://developers.klaviyo.com/en/reference/get_lists
            endpoint: '/api/lists',
            headers: {
                revision: '2026-04-15'
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'links.next',
                response_path: 'data',
                limit_name_in_request: 'page[size]',
                limit: 10
            },
            retries: 3
        };

        await nango.trackDeletesStart('List');

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected page to be an array from response_path: data');
            }

            const lists = [];
            for (const raw of page) {
                const parsed = KlaviyoListItemSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse list item: ${parsed.error.message}`);
                }

                const item = parsed.data;
                lists.push({
                    id: item.id,
                    ...(item.attributes?.name != null && { name: item.attributes.name }),
                    ...(item.attributes?.created != null && { created: item.attributes.created }),
                    ...(item.attributes?.updated != null && { updated: item.attributes.updated })
                });
            }

            if (lists.length > 0) {
                await nango.batchSave(lists, 'List');
            }
        }

        await nango.trackDeletesEnd('List');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
