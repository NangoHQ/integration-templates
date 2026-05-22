import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LIMIT = 100;

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const MetaDataSchema = z.object({
    id: z.number().optional(),
    key: z.string().optional(),
    value: z.unknown().optional()
});

const ProviderCouponSchema = z.object({
    id: z.number(),
    code: z.string(),
    amount: z.string().nullable().optional(),
    date_created: z.string().nullable().optional(),
    date_created_gmt: z.string().nullable().optional(),
    date_modified: z.string().nullable().optional(),
    date_modified_gmt: z.string().nullable().optional(),
    discount_type: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    date_expires: z.string().nullable().optional(),
    date_expires_gmt: z.string().nullable().optional(),
    usage_count: z.number().nullable().optional(),
    individual_use: z.boolean().nullable().optional(),
    product_ids: z.array(z.number()).nullable().optional(),
    excluded_product_ids: z.array(z.number()).nullable().optional(),
    usage_limit: z.number().nullable().optional(),
    usage_limit_per_user: z.number().nullable().optional(),
    limit_usage_to_x_items: z.number().nullable().optional(),
    free_shipping: z.boolean().nullable().optional(),
    product_categories: z.array(z.number()).nullable().optional(),
    excluded_product_categories: z.array(z.number()).nullable().optional(),
    exclude_sale_items: z.boolean().nullable().optional(),
    minimum_amount: z.string().nullable().optional(),
    maximum_amount: z.string().nullable().optional(),
    email_restrictions: z.array(z.string()).nullable().optional(),
    used_by: z.array(z.string()).nullable().optional(),
    meta_data: z.array(MetaDataSchema).nullable().optional()
});

const CouponSchema = z.object({
    id: z.string(),
    code: z.string(),
    amount: z.string().optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional(),
    discount_type: z.string().optional(),
    description: z.string().optional(),
    date_expires: z.string().optional(),
    usage_count: z.number().optional(),
    individual_use: z.boolean().optional(),
    product_ids: z.array(z.number()).optional(),
    excluded_product_ids: z.array(z.number()).optional(),
    usage_limit: z.number().optional(),
    usage_limit_per_user: z.number().optional(),
    limit_usage_to_x_items: z.number().optional(),
    free_shipping: z.boolean().optional(),
    product_categories: z.array(z.number()).optional(),
    excluded_product_categories: z.array(z.number()).optional(),
    exclude_sale_items: z.boolean().optional(),
    minimum_amount: z.string().optional(),
    maximum_amount: z.string().optional(),
    email_restrictions: z.array(z.string()).optional(),
    used_by: z.array(z.string()).optional(),
    meta_data: z
        .array(
            z.object({
                id: z.number().optional(),
                key: z.string().optional(),
                value: z.unknown().optional()
            })
        )
        .optional()
});

const sync = createSync({
    description: 'Sync coupons from WooCommerce.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/coupons' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Coupon: CouponSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;

        const proxyConfig: ProxyConfiguration = {
            // https://woocommerce.github.io/woocommerce-rest-api-docs/?shell#list-all-coupons
            endpoint: '/wp-json/wc/v3/coupons',
            params: {
                orderby: 'modified',
                order: 'asc',
                ...(updatedAfter && { modified_after: updatedAfter })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: LIMIT
            },
            retries: 3
        };

        let lastProcessedUpdatedAt: string | undefined;

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderCouponSchema).safeParse(pageResults);
            if (!parsed.success) {
                throw new Error(`Invalid coupon response: ${parsed.error.message}`);
            }

            const coupons = parsed.data.map((record) => {
                return {
                    id: String(record.id),
                    code: record.code,
                    ...(record.amount != null && { amount: record.amount }),
                    ...(record.date_created != null && { date_created: record.date_created }),
                    ...(record.date_modified != null && { date_modified: record.date_modified }),
                    ...(record.discount_type != null && { discount_type: record.discount_type }),
                    ...(record.description != null && { description: record.description }),
                    ...(record.date_expires != null && { date_expires: record.date_expires }),
                    ...(record.usage_count != null && { usage_count: record.usage_count }),
                    ...(record.individual_use != null && { individual_use: record.individual_use }),
                    ...(record.product_ids != null && { product_ids: record.product_ids }),
                    ...(record.excluded_product_ids != null && { excluded_product_ids: record.excluded_product_ids }),
                    ...(record.usage_limit != null && { usage_limit: record.usage_limit }),
                    ...(record.usage_limit_per_user != null && { usage_limit_per_user: record.usage_limit_per_user }),
                    ...(record.limit_usage_to_x_items != null && { limit_usage_to_x_items: record.limit_usage_to_x_items }),
                    ...(record.free_shipping != null && { free_shipping: record.free_shipping }),
                    ...(record.product_categories != null && { product_categories: record.product_categories }),
                    ...(record.excluded_product_categories != null && { excluded_product_categories: record.excluded_product_categories }),
                    ...(record.exclude_sale_items != null && { exclude_sale_items: record.exclude_sale_items }),
                    ...(record.minimum_amount != null && { minimum_amount: record.minimum_amount }),
                    ...(record.maximum_amount != null && { maximum_amount: record.maximum_amount }),
                    ...(record.email_restrictions != null && { email_restrictions: record.email_restrictions }),
                    ...(record.used_by != null && { used_by: record.used_by }),
                    ...(record.meta_data != null && { meta_data: record.meta_data })
                };
            });

            if (coupons.length === 0) {
                continue;
            }

            await nango.batchSave(coupons, 'Coupon');
            const lastRecord = parsed.data[parsed.data.length - 1];
            if (!lastRecord) {
                continue;
            }
            lastProcessedUpdatedAt =
                lastRecord.date_modified ?? lastRecord.date_modified_gmt ?? lastRecord.date_created ?? lastRecord.date_created_gmt ?? undefined;
        }

        if (lastProcessedUpdatedAt) {
            await nango.saveCheckpoint({ updated_after: lastProcessedUpdatedAt });
        }
    }
});

export default sync;
