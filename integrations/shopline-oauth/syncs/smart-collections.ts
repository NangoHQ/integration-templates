import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const SmartCollectionImageSchema = z
    .object({
        src: z.string().optional().describe('The source URL of the collection image.'),
        width: z.number().optional().describe('The width of the collection image in pixels.'),
        height: z.number().optional().describe('The height of the collection image in pixels.'),
        alt: z.string().optional().describe('Alternative text describing the collection image.')
    })
    .passthrough();

const SmartCollectionRuleSchema = z
    .object({
        column: z.string().describe('The product property to evaluate in this rule (e.g. title, vendor, tag, variant_price).'),
        relation: z.string().describe('The comparison operator for the rule (e.g. equals, contains, greater_than, less_than).'),
        condition: z.string().describe('The value to compare against the selected column.')
    })
    .passthrough();

const SmartCollectionSchema = z
    .object({
        id: z.string().describe('The unique identifier of the smart collection.'),
        title: z.string().describe('The display name of the smart collection.'),
        handle: z.string().describe('The URL-friendly handle used for the collection in storefront links.'),
        body_html: z.string().nullable().optional().describe('The HTML description of the smart collection.'),
        published_at: z.string().nullable().optional().describe('The ISO 8601 timestamp when the collection was published, if applicable.'),
        published_scope: z.string().nullable().optional().describe('The visibility scope of the collection (e.g. web, global).'),
        sort_order: z.string().nullable().optional().describe('The default sort order for products displayed in this collection.'),
        template_suffix: z.string().nullable().optional().describe('The suffix of the custom template assigned to this collection, if any.'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the collection was last updated.'),
        created_at: z.string().describe('The ISO 8601 timestamp when the collection was created.'),
        image: SmartCollectionImageSchema.nullable().optional().describe('The image associated with the smart collection.'),
        rules: z
            .array(SmartCollectionRuleSchema)
            .nullable()
            .optional()
            .describe('The rule-based membership definition that determines which products belong to this collection.')
    })
    .describe('A smart (intelligent, rule-based) collection whose product membership is computed dynamically by the provider.');

const CheckpointSchema = z.object({
    updated_after: z.string(),
    page_info: z.string()
});

const sync = createSync({
    description: 'Sync smart (intelligent, rule-based) collections.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        SmartCollection: SmartCollectionSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let updatedAfter: string | undefined = checkpoint?.updated_after || undefined;
        let pageInfo: string | undefined = checkpoint?.page_info || undefined;

        if (pageInfo === '') {
            pageInfo = undefined;
        }

        const params: Record<string, string | number> = {
            limit: 2
        };

        if (updatedAfter) {
            params['updated_at_min'] = updatedAfter;
        }

        if (pageInfo) {
            params['page_info'] = pageInfo;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/products/smart-collections/smart-collections-list
            endpoint: '/admin/openapi/v20260601/products/smart_collections.json',
            params,
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                response_path: 'smart_collections',
                limit: 2,
                limit_name_in_request: 'limit',
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'string') {
                        const url = new URL(nextPageParam);
                        pageInfo = url.searchParams.get('page_info') ?? undefined;
                    } else {
                        pageInfo = undefined;
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const validated = z.array(SmartCollectionSchema).parse(page);
            const collections = validated.map((record) => ({
                id: record.id,
                title: record.title,
                handle: record.handle,
                ...(record.body_html != null && { body_html: record.body_html }),
                ...(record.published_at != null && { published_at: record.published_at }),
                ...(record.published_scope != null && { published_scope: record.published_scope }),
                ...(record.sort_order != null && { sort_order: record.sort_order }),
                ...(record.template_suffix != null && { template_suffix: record.template_suffix }),
                updated_at: record.updated_at,
                created_at: record.created_at,
                ...(record.image != null && { image: record.image }),
                ...(record.rules != null && { rules: record.rules })
            }));

            if (collections.length === 0) {
                continue;
            }

            await nango.batchSave(collections, 'SmartCollection');

            if (pageInfo) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || '',
                    page_info: pageInfo
                });
                continue;
            }

            const lastRecord = collections[collections.length - 1];
            if (!lastRecord) {
                continue;
            }

            updatedAfter = lastRecord.updated_at;
            await nango.saveCheckpoint({ updated_after: updatedAfter, page_info: '' });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
