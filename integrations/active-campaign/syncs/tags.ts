import { createSync } from 'nango';
import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';

const ProviderTagSchema = z.object({
    id: z.union([z.string(), z.number()]),
    tagType: z.string().optional(),
    tag: z.string().optional(),
    description: z.string().optional(),
    cdate: z.string().optional()
});

const TagSchema = z.object({
    id: z.string(),
    tagType: z.string().optional(),
    tag: z.string().optional(),
    description: z.string().optional(),
    cdate: z.string().optional()
});

const sync = createSync({
    description: 'Sync tags from ActiveCampaign.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Tag: TagSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/tags'
        }
    ],

    exec: async (nango) => {
        // Blocker: The GET /3/tags endpoint does not support updated_after, modified_since,
        // cursor, or since_id parameters. The response only includes cdate (creation date),
        // not an updated timestamp, so incremental sync is not possible.
        await nango.trackDeletesStart('Tag');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.activecampaign.com/reference/retrieve-all-tags
            endpoint: '/3/tags',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'tags'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const tags = page.map((record) => {
                const parsed = ProviderTagSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse tag: ${JSON.stringify(record)}`);
                }
                return {
                    id: String(parsed.data.id),
                    ...(parsed.data.tagType != null && { tagType: parsed.data.tagType }),
                    ...(parsed.data.tag != null && { tag: parsed.data.tag }),
                    ...(parsed.data.description != null && { description: parsed.data.description }),
                    ...(parsed.data.cdate != null && { cdate: parsed.data.cdate })
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
