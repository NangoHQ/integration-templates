import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProductAttributeSchema = z
    .object({
        id: z.string().describe('Opaque global attribute identifier within this store.'),
        name: z.string().describe('Attribute display name.'),
        slug: z.string().describe('Stored taxonomy slug, retaining any provider prefix.'),
        type: z.string().describe('Stored attribute type, normally select.'),
        orderBy: z.string().describe("Default ordering mode for the attribute's terms."),
        hasArchives: z.boolean().describe('Whether public archives are enabled for the attribute.')
    })
    .describe('Global product attribute definition replicated from the store.');

const WooCommerceAttributeSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    slug: z.string(),
    type: z.string(),
    order_by: z.string(),
    has_archives: z.boolean()
});

const sync = createSync({
    description:
        'Maintain a replicated dataset of global product attribute definitions, including their taxonomy slugs, types, default term ordering, and archive settings.',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    models: {
        ProductAttribute: ProductAttributeSchema
    },

    exec: async (nango) => {
        // Full refresh: the product attributes endpoint offers no changed-since
        // filter and no deleted-records endpoint, so every run walks the full
        // dataset from page 1 and deletions are detected from the complete set.
        await nango.trackDeletesStart('ProductAttribute');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.woocommerce.com/docs/apis/rest-api/v3/product-attributes
            endpoint: '/wp-json/wc/v3/products/attributes',
            params: {
                per_page: 100
            },
            retries: 3
        };

        const response = await nango.get(proxyConfig);
        // Parse failure throws here on purpose: silently skipping a malformed
        // record would mark it deleted when trackDeletesEnd runs.
        const attributes = z.array(WooCommerceAttributeSchema).parse(response.data);
        const records = attributes.map((attribute) => ({
            id: attribute.id.toString(),
            name: attribute.name,
            slug: attribute.slug,
            type: attribute.type,
            orderBy: attribute.order_by,
            hasArchives: attribute.has_archives
        }));

        if (records.length > 0) {
            await nango.batchSave(records, 'ProductAttribute');
        }

        await nango.trackDeletesEnd('ProductAttribute');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
