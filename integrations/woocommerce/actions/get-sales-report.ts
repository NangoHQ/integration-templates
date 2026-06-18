import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    period: z.string().optional().describe('Report period. Options: week, month, last_month, year'),
    date_min: z.string().optional().describe('Start date in YYYY-MM-DD format'),
    date_max: z.string().optional().describe('End date in YYYY-MM-DD format')
});

const SalesReportTotalSchema = z.object({
    sales: z.string(),
    orders: z.number(),
    items: z.number(),
    tax: z.string(),
    shipping: z.string(),
    discount: z.string(),
    customers: z.number()
});

const SalesReportSchema = z.object({
    total_sales: z.string(),
    net_sales: z.string(),
    average_sales: z.string(),
    total_orders: z.number(),
    total_items: z.number(),
    total_tax: z.string(),
    total_shipping: z.string(),
    total_refunds: z.number(),
    total_discount: z.string(),
    totals_grouped_by: z.string(),
    totals: z.record(z.string(), SalesReportTotalSchema),
    total_customers: z.number()
});

const OutputSchema = z.array(SalesReportSchema);

const action = createAction({
    description: 'Retrieve the sales report from WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#reports
            endpoint: 'wp-json/wc/v3/reports/sales',
            params: {
                ...(input.period !== undefined && { period: input.period }),
                ...(input.date_min !== undefined && { date_min: input.date_min }),
                ...(input.date_max !== undefined && { date_max: input.date_max })
            },
            retries: 3
        });

        const reports = OutputSchema.parse(response.data);
        return reports;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
