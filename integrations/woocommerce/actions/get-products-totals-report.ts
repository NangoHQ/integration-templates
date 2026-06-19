import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderProductTotalSchema = z.object({
    slug: z.string(),
    name: z.string(),
    total: z.union([z.string(), z.number()])
});

const ProductTotalSchema = z.object({
    slug: z.string(),
    name: z.string(),
    total: z.string()
});

const OutputSchema = z.array(ProductTotalSchema);

const action = createAction({
    description: 'Retrieve the products totals report from WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#retrieve-products-totals
            endpoint: '/wp-json/wc/v3/reports/products/totals',
            retries: 3
        });

        const providerData = z.array(ProviderProductTotalSchema).parse(response.data);
        return providerData.map((item) => ({
            slug: item.slug,
            name: item.name,
            total: String(item.total)
        }));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
