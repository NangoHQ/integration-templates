import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Coupon ID. Example: 22'),
    force: z.boolean().optional().describe('Whether to permanently delete the coupon. Defaults to false (moved to trash).')
});

const ProviderCouponSchema = z
    .object({
        id: z.number(),
        code: z.string().optional().nullable(),
        amount: z.string().optional().nullable(),
        date_created: z.string().optional().nullable(),
        date_created_gmt: z.string().optional().nullable(),
        date_modified: z.string().optional().nullable(),
        date_modified_gmt: z.string().optional().nullable(),
        discount_type: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        expiry_date: z.string().optional().nullable(),
        usage_count: z.number().optional().nullable(),
        individual_use: z.boolean().optional().nullable(),
        product_ids: z.array(z.number()).optional().nullable(),
        excluded_product_ids: z.array(z.number()).optional().nullable(),
        usage_limit: z.number().optional().nullable(),
        usage_limit_per_user: z.number().optional().nullable(),
        limit_usage_to_x_items: z.number().optional().nullable(),
        free_shipping: z.boolean().optional().nullable(),
        product_categories: z.array(z.number()).optional().nullable(),
        excluded_product_categories: z.array(z.number()).optional().nullable(),
        exclude_sale_items: z.boolean().optional().nullable(),
        minimum_amount: z.string().optional().nullable(),
        maximum_amount: z.string().optional().nullable(),
        email_restrictions: z.array(z.string()).optional().nullable(),
        used_by: z.array(z.string()).optional().nullable(),
        meta_data: z.array(z.object({}).passthrough()).optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number(),
    code: z.string().optional(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete or archive a coupon in WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://woocommerce.github.io/woocommerce-rest-api-docs/#delete-a-coupon
        const response = await nango.delete({
            endpoint: `/wp-json/wc/v3/coupons/${encodeURIComponent(String(input.id))}`,
            params: {
                ...(input.force !== undefined && { force: String(input.force) })
            },
            retries: 10
        });

        const coupon = ProviderCouponSchema.parse(response.data);

        return {
            id: coupon.id,
            ...(coupon.code != null && { code: coupon.code }),
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
