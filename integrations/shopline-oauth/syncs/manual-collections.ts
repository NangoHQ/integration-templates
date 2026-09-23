import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderImageSchema = z
    .object({
        alt: z.string().nullable().optional(),
        src: z.string().nullable().optional(),
        path: z.string().nullable().optional()
    })
    .passthrough();

const ProviderBannerSchema = z
    .object({
        alt: z.string().nullable().optional(),
        src: z.string().nullable().optional()
    })
    .passthrough();

const ProviderCollectionSchema = z
    .object({
        id: z.string(),
        handle: z.string(),
        title: z.string(),
        body_html: z.string().nullable().optional(),
        updated_at: z.string(),
        created_at: z.string(),
        published_at: z.string().nullable().optional(),
        published_scope: z.string().nullable().optional(),
        sort_order: z.string().nullable().optional(),
        template_path: z.string().nullable().optional(),
        image: ProviderImageSchema.nullable().optional(),
        banner: ProviderBannerSchema.nullable().optional()
    })
    .passthrough();

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const ImageSchema = z
    .object({
        alt: z.string().optional().describe('The alternative textual description of the image'),
        src: z.string().optional().describe('The URL link to the image'),
        path: z.string().optional().describe('The relative path of the image')
    })
    .describe('An image associated with a collection');

const BannerSchema = z
    .object({
        alt: z.string().optional().describe('The alternative textual description of the banner image'),
        src: z.string().optional().describe('The URL link to the banner image')
    })
    .describe('The cover image of a collection');

const ManualCollectionSchema = z
    .object({
        id: z.string().describe('The unique identifier for the collection'),
        handle: z.string().describe('The semantically unique identifier for the collection, generated based on title by default'),
        title: z.string().describe('The title of the collection'),
        body_html: z.string().optional().describe('The collection description'),
        updated_at: z.string().describe('The date and time when the collection was last updated, in ISO 8601 format'),
        created_at: z.string().describe('The date and time when the collection was created, in ISO 8601 format'),
        published_at: z.string().optional().describe('The date and time when the collection was published to the online store, in ISO 8601 format'),
        published_scope: z.string().optional().describe('The published scope of collection sales channels, typically web for the online store'),
        sort_order: z
            .string()
            .optional()
            .describe('The sorting method of the collection, e.g., manual, best-selling, alpha-asc, alpha-desc, updated-desc, updated-asc'),
        template_path: z.string().optional().describe('The template path of the theme for this collection'),
        image: ImageSchema.optional().describe('The collection image'),
        banner: BannerSchema.optional().describe('The cover image of the collection')
    })
    .describe('A manual (custom) collection in the SHOPLINE store');

const sync = createSync({
    description: 'Sync manual (custom) collections from SHOPLINE',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ManualCollection: ManualCollectionSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const proxyConfig: ProxyConfiguration = {
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/collection/get-manual-collections
            endpoint: '/admin/openapi/v20260601/products/custom_collections.json',
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit: 100,
                limit_name_in_request: 'limit',
                response_path: 'custom_collections'
            },
            retries: 3
        };

        if (checkpoint && checkpoint['updated_after']) {
            proxyConfig.params = {
                updated_at_min: checkpoint['updated_after']
            };
        }

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected page to be an array');
            }

            const mappedCollections = page.map((raw) => {
                const parsed = ProviderCollectionSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse collection: ${parsed.error.message}`);
                }
                const collection = parsed.data;

                return {
                    id: collection.id,
                    handle: collection.handle,
                    title: collection.title,
                    ...(collection.body_html != null && { body_html: collection.body_html }),
                    updated_at: collection.updated_at,
                    created_at: collection.created_at,
                    ...(collection.published_at != null && { published_at: collection.published_at }),
                    ...(collection.published_scope != null && { published_scope: collection.published_scope }),
                    ...(collection.sort_order != null && { sort_order: collection.sort_order }),
                    ...(collection.template_path != null && { template_path: collection.template_path }),
                    ...(collection.image != null && {
                        image: {
                            ...(collection.image.alt != null && { alt: collection.image.alt }),
                            ...(collection.image.src != null && { src: collection.image.src }),
                            ...(collection.image.path != null && { path: collection.image.path })
                        }
                    }),
                    ...(collection.banner != null && {
                        banner: {
                            ...(collection.banner.alt != null && { alt: collection.banner.alt }),
                            ...(collection.banner.src != null && { src: collection.banner.src })
                        }
                    })
                };
            });

            if (mappedCollections.length === 0) {
                continue;
            }

            await nango.batchSave(mappedCollections, 'ManualCollection');

            const lastCollection = mappedCollections[mappedCollections.length - 1];
            if (lastCollection === undefined) {
                continue;
            }
            const lastUpdatedAt = lastCollection.updated_at;
            await nango.saveCheckpoint({
                updated_after: lastUpdatedAt
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
