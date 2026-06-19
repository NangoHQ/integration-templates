import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().int().min(1).optional().describe('Current page of the collection. Default: 1'),
    per_page: z.number().int().min(1).max(100).optional().describe('Maximum number of items to be returned in result set. Default: 10'),
    search: z.string().optional().describe('Limit results to those matching a string.'),
    after: z.string().optional().describe('Limit response to resources published after a given ISO8601 compliant date.'),
    before: z.string().optional().describe('Limit response to resources published before a given ISO8601 compliant date.'),
    exclude: z.array(z.number()).optional().describe('Ensure result set excludes specific IDs.'),
    include: z.array(z.number()).optional().describe('Limit result set to specific IDs.'),
    offset: z.number().int().min(0).optional().describe('Offset the result set by a specific number of items.'),
    order: z.enum(['asc', 'desc']).optional().describe('Order sort attribute ascending or descending.'),
    orderby: z.enum(['id', 'include', 'name', 'date', 'modified', 'code']).optional().describe('Sort collection by object attribute.'),
    code: z.string().optional().describe('Limit result set to resources with a specific code.')
});

const CouponSchema = z.object({
    id: z.number().describe('Unique identifier for the coupon.'),
    code: z.string().describe('Coupon code.'),
    amount: z.string().optional().describe('The amount of discount.'),
    discount_type: z.enum(['percent', 'fixed_cart', 'fixed_product']).optional().describe('Determines the type of discount that will be applied.'),
    description: z.string().optional().describe('Coupon description.'),
    date_created: z.string().optional().describe('The date the coupon was created, in the sites timezone.'),
    date_created_gmt: z.string().optional().describe('The date the coupon was created, as GMT.'),
    date_modified: z.string().optional().describe('The date the coupon was last modified, in the sites timezone.'),
    date_modified_gmt: z.string().optional().describe('The date the coupon was last modified, as GMT.'),
    date_expires: z.string().nullable().optional().describe('The date the coupon expires.'),
    date_expires_gmt: z.string().nullable().optional().describe('The date the coupon expires, as GMT.'),
    usage_count: z.number().optional().describe('Number of times the coupon has been used already.'),
    individual_use: z.boolean().optional().describe('Whether the coupon is for individual use only.'),
    product_ids: z.array(z.number()).optional().describe('List of product IDs the coupon can be applied to.'),
    excluded_product_ids: z.array(z.number()).optional().describe('List of product IDs the coupon cannot be applied to.'),
    usage_limit: z.number().nullable().optional().describe('How many times the coupon can be used.'),
    usage_limit_per_user: z.number().nullable().optional().describe('How many times the coupon can be used per customer.'),
    limit_usage_to_x_items: z.number().nullable().optional().describe('Max number of items in the cart the coupon can be applied to.'),
    free_shipping: z.boolean().optional().describe('Whether the coupon grants free shipping.'),
    product_categories: z.array(z.number()).optional().describe('List of category IDs the coupon applies to.'),
    excluded_product_categories: z.array(z.number()).optional().describe('List of category IDs the coupon does not apply to.'),
    exclude_sale_items: z.boolean().optional().describe('Whether the coupon excludes sale items.'),
    minimum_amount: z.string().optional().describe('Minimum order amount that needs to be in the cart before coupon applies.'),
    maximum_amount: z.string().optional().describe('Maximum order amount allowed when using the coupon.'),
    email_restrictions: z.array(z.string()).optional().describe('List of email addresses that can use this coupon.'),
    used_by: z.array(z.string()).optional().describe('List of user IDs who have used the coupon.')
});

const OutputSchema = z.object({
    coupons: z.array(CouponSchema).describe('List of coupons.'),
    total_pages: z.number().optional().describe('Total number of pages.'),
    total: z.number().optional().describe('Total number of coupons.')
});

const action = createAction({
    description: 'List coupons from WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-coupons
        const response = await nango.get({
            endpoint: '/wp-json/wc/v3/coupons',
            params: {
                ...(input.page !== undefined && { page: String(input.page) }),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.search !== undefined && { search: input.search }),
                ...(input.after !== undefined && { after: input.after }),
                ...(input.before !== undefined && { before: input.before }),
                ...(input.exclude !== undefined && { exclude: input.exclude.join(',') }),
                ...(input.include !== undefined && { include: input.include.join(',') }),
                ...(input.offset !== undefined && { offset: String(input.offset) }),
                ...(input.order !== undefined && { order: input.order }),
                ...(input.orderby !== undefined && { orderby: input.orderby }),
                ...(input.code !== undefined && { code: input.code })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'No data returned from WooCommerce API'
            });
        }

        const coupons = z.array(CouponSchema).parse(response.data);

        // Extract pagination info from headers
        const totalPages = response.headers['x-wp-totalpages'] ? parseInt(response.headers['x-wp-totalpages'], 10) : undefined;
        const total = response.headers['x-wp-total'] ? parseInt(response.headers['x-wp-total'], 10) : undefined;

        return {
            coupons: coupons,
            ...(totalPages !== undefined && { total_pages: totalPages }),
            ...(total !== undefined && { total: total })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
