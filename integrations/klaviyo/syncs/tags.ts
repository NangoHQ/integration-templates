import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TagSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    tag_group_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const KlaviyoTagAttributesSchema = z.object({
    name: z.string().optional().nullable(),
    inserted_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
});

const KlaviyoTagGroupRelationshipDataSchema = z.object({
    id: z.string(),
    type: z.string()
});

const KlaviyoTagRelationshipsSchema = z.object({
    'tag-group': z
        .object({
            data: KlaviyoTagGroupRelationshipDataSchema.optional().nullable()
        })
        .optional()
        .nullable()
});

const KlaviyoTagSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: KlaviyoTagAttributesSchema,
    relationships: KlaviyoTagRelationshipsSchema.optional().nullable()
});

const sync = createSync({
    description: 'Sync tags.',
    version: '1.0.0',
    frequency: 'every hour',
    models: {
        Tag: TagSchema
    },

    exec: async (nango) => {
        // Blocker: Klaviyo GET /api/tags does not expose an updated-since or modified-since filter,
        // only page[cursor] pagination via links.next. Full refresh with delete tracking is required.
        await nango.trackDeletesStart('Tag');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.klaviyo.com/en/reference/get_tags
            endpoint: '/api/tags',
            headers: {
                revision: '2026-04-15'
            },
            params: {
                'page[size]': 20
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'links.next',
                response_path: 'data',
                limit_name_in_request: 'page[size]',
                limit: 20
            },
            retries: 3
        };

        for await (const tags of nango.paginate(proxyConfig)) {
            const parsed = z.array(KlaviyoTagSchema).safeParse(tags);
            if (!parsed.success) {
                throw new Error(`Failed to parse tags: ${parsed.error.message}`);
            }

            const records = parsed.data.map((tag) => ({
                id: tag.id,
                ...(tag.attributes.name != null && { name: tag.attributes.name }),
                ...(tag.relationships?.['tag-group']?.data != null && { tag_group_id: tag.relationships['tag-group'].data.id }),
                ...(tag.attributes.inserted_at != null && { created_at: tag.attributes.inserted_at }),
                ...(tag.attributes.updated_at != null && { updated_at: tag.attributes.updated_at })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Tag');
            }
        }

        await nango.trackDeletesEnd('Tag');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
