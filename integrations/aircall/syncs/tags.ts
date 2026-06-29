import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AircallTagSchema = z.object({
    id: z.number(),
    name: z.string(),
    color: z.string().nullable().optional(),
    description: z.string().nullable().optional()
});

const TagSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    description: z.string().optional()
});

const sync = createSync({
    description: 'Sync tags from Aircall',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Tag: TagSchema
    },

    exec: async (nango) => {
        // Blocker: GET /v1/tags does not support updated_after, cursor, or any
        // changed-since filter. There is no deleted-record endpoint for tags.
        // Full refresh with deletion detection is required.
        await nango.trackDeletesStart('Tag');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.aircall.io/api-references/#list-all-tags
            endpoint: '/v1/tags',
            paginate: {
                type: 'link',
                link_path_in_response_body: 'meta.next_page_link',
                response_path: 'tags',
                limit_name_in_request: 'per_page',
                limit: 50
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const tags = page.map((item: unknown) => {
                const parsed = AircallTagSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse tag: ${parsed.error.message}`);
                }
                const tag = parsed.data;
                return {
                    id: String(tag.id),
                    name: tag.name,
                    ...(tag.color != null && { color: tag.color }),
                    ...(tag.description != null && { description: tag.description })
                };
            });

            if (tags.length > 0) {
                await nango.batchSave(tags, 'Tag');
            }
        }

        await nango.trackDeletesEnd('Tag');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
