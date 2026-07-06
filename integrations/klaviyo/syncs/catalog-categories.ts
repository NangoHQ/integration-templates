import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CatalogCategoryApiSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: z.object({
        external_id: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        updated: z.string().nullable().optional()
    })
});

const CatalogCategorySchema = z.object({
    id: z.string(),
    external_id: z.string().optional(),
    name: z.string().optional(),
    updated: z.string().optional()
});

const sync = createSync({
    description: 'Sync catalog categories.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        CatalogCategory: CatalogCategorySchema
    },

    exec: async (nango) => {
        // Blocker: GET /api/catalog-categories has no updated_after, modified_since,
        // changed-records endpoint, or resumable cursor. Only ids, item.id, and name
        // filters are available, none of which support incremental sync.
        await nango.trackDeletesStart('CatalogCategory');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.klaviyo.com/en/reference/get_catalog_categories
            endpoint: '/api/catalog-categories',
            headers: {
                revision: '2026-04-15'
            },
            params: {
                'page[size]': 100
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'links.next',
                response_path: 'data',
                limit_name_in_request: 'page[size]',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected paginated page to be an array');
            }

            const categories: Array<z.infer<typeof CatalogCategorySchema>> = [];
            for (const raw of page) {
                const parsed = CatalogCategoryApiSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse catalog category: ${parsed.error.message}`);
                }
                const record = parsed.data;
                const mapped: z.infer<typeof CatalogCategorySchema> = {
                    id: record.id
                };
                if (record.attributes.external_id != null) {
                    mapped.external_id = record.attributes.external_id;
                }
                if (record.attributes.name != null) {
                    mapped.name = record.attributes.name;
                }
                if (record.attributes.updated != null) {
                    mapped.updated = record.attributes.updated;
                }
                categories.push(mapped);
            }

            if (categories.length > 0) {
                await nango.batchSave(categories, 'CatalogCategory');
            }
        }

        await nango.trackDeletesEnd('CatalogCategory');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
