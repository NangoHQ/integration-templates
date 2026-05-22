import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Coupon ID. Example: 17')
});

const ProviderMetaDataSchema = z.object({
    id: z.number(),
    key: z.string(),
    value: z.string()
});

const ProviderCouponSchema = z.object({
    id: z.number(),
    code: z.string(),
    amount: z.string(),
    date_created: z.string(),
    date_created_gmt: z.string(),
    date_modified: z.string(),
    date_modified_gmt: z.string(),
    discount_type: z.string(),
    description: z.string(),
    date_expires: z.string().nullable(),
    date_expires_gmt: z.string().nullable(),
    usage_count: z.number(),
    individual_use: z.boolean(),
    product_ids: z.array(z.number()),
    excluded_product_ids: z.array(z.number()),
    usage_limit: z.number().nullable(),
    usage_limit_per_user: z.number().nullable(),
    limit_usage_to_x_items: z.number().nullable(),
    free_shipping: z.boolean(),
    product_categories: z.array(z.number()),
    excluded_product_categories: z.array(z.number()),
    exclude_sale_items: z.boolean(),
    minimum_amount: z.string(),
    maximum_amount: z.string(),
    email_restrictions: z.array(z.string()),
    used_by: z.array(z.union([z.number(), z.string()])),
    meta_data: z.array(ProviderMetaDataSchema),
    _links: z.record(z.string(), z.array(z.object({ href: z.string() }))).optional()
});

const OutputSchema = z.object({
    id: z.number(),
    code: z.string(),
    amount: z.string(),
    date_created: z.string(),
    date_created_gmt: z.string(),
    date_modified: z.string(),
    date_modified_gmt: z.string(),
    discount_type: z.string(),
    description: z.string().optional(),
    date_expires: z.string().optional(),
    date_expires_gmt: z.string().optional(),
    usage_count: z.number(),
    individual_use: z.boolean(),
    product_ids: z.array(z.number()),
    excluded_product_ids: z.array(z.number()),
    usage_limit: z.number().optional(),
    usage_limit_per_user: z.number().optional(),
    limit_usage_to_x_items: z.number().optional(),
    free_shipping: z.boolean(),
    product_categories: z.array(z.number()),
    excluded_product_categories: z.array(z.number()),
    exclude_sale_items: z.boolean(),
    minimum_amount: z.string(),
    maximum_amount: z.string(),
    email_restrictions: z.array(z.string()),
    used_by: z.array(z.union([z.number(), z.string()])),
    meta_data: z.array(
        z.object({
            id: z.number(),
            key: z.string(),
            value: z.string()
        })
    ),
    _links: z.record(z.string(), z.array(z.object({ href: z.string() }))).optional()
});

const action = createAction({
    description: 'Retrieve a single coupon from WooCommerce',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-coupon',
        group: 'Coupons'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#retrieve-a-coupon
            endpoint: `/wp-json/wc/v3/coupons/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Coupon with id ${input.id} not found`
            });
        }

        const providerCoupon = ProviderCouponSchema.parse(response.data);

        return {
            id: providerCoupon.id,
            code: providerCoupon.code,
            amount: providerCoupon.amount,
            date_created: providerCoupon.date_created,
            date_created_gmt: providerCoupon.date_created_gmt,
            date_modified: providerCoupon.date_modified,
            date_modified_gmt: providerCoupon.date_modified_gmt,
            discount_type: providerCoupon.discount_type,
            ...(providerCoupon.description !== '' && { description: providerCoupon.description }),
            ...(providerCoupon.date_expires != null && { date_expires: providerCoupon.date_expires }),
            ...(providerCoupon.date_expires_gmt != null && { date_expires_gmt: providerCoupon.date_expires_gmt }),
            usage_count: providerCoupon.usage_count,
            individual_use: providerCoupon.individual_use,
            product_ids: providerCoupon.product_ids,
            excluded_product_ids: providerCoupon.excluded_product_ids,
            ...(providerCoupon.usage_limit != null && { usage_limit: providerCoupon.usage_limit }),
            ...(providerCoupon.usage_limit_per_user != null && { usage_limit_per_user: providerCoupon.usage_limit_per_user }),
            ...(providerCoupon.limit_usage_to_x_items != null && { limit_usage_to_x_items: providerCoupon.limit_usage_to_x_items }),
            free_shipping: providerCoupon.free_shipping,
            product_categories: providerCoupon.product_categories,
            excluded_product_categories: providerCoupon.excluded_product_categories,
            exclude_sale_items: providerCoupon.exclude_sale_items,
            minimum_amount: providerCoupon.minimum_amount,
            maximum_amount: providerCoupon.maximum_amount,
            email_restrictions: providerCoupon.email_restrictions,
            used_by: providerCoupon.used_by,
            meta_data: providerCoupon.meta_data,
            ...(providerCoupon._links !== undefined && { _links: providerCoupon._links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
