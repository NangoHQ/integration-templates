import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    period: z.enum(['week', 'month', 'last_month', 'year']).optional().describe('Report period. Example: "week"'),
    date_min: z.string().optional().describe('Start date in YYYY-MM-DD format. Example: "2024-01-01"'),
    date_max: z.string().optional().describe('End date in YYYY-MM-DD format. Example: "2024-01-31"')
});

const ProviderTopSellerSchema = z
    .object({
        title: z.string().optional(),
        name: z.string().optional(),
        product_id: z.number(),
        quantity: z.number()
    })
    .passthrough();

const TopSellerSchema = z.object({
    title: z.string(),
    product_id: z.number(),
    quantity: z.number()
});

const OutputSchema = z.array(TopSellerSchema);

const action = createAction({
    description: 'Retrieve the top sellers report from WooCommerce.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-top-sellers-report',
        group: 'Reports'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#retrieve-top-sellers-report
            endpoint: '/wp-json/wc/v3/reports/top_sellers',
            params: {
                ...(input.period !== undefined && { period: input.period }),
                ...(input.date_min !== undefined && { date_min: input.date_min }),
                ...(input.date_max !== undefined && { date_max: input.date_max })
            },
            retries: 3
        });

        const providerData = z.array(ProviderTopSellerSchema).parse(response.data);

        return providerData.map((item) => ({
            title: item.title ?? item.name ?? '',
            product_id: item.product_id,
            quantity: item.quantity
        }));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
