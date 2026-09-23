import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const ProviderPrerequisiteSubtotalRangeSchema = z
    .object({
        greater_than_or_equal_to: z.string().nullish()
    })
    .nullish();

const ProviderPrerequisiteQuantityRangeSchema = z
    .object({
        greater_than_or_equal_to: z.number().nullish()
    })
    .nullish();

const ProviderPrerequisiteToEntitlementQuantityRatioSchema = z
    .object({
        entitled_quantity: z.number().nullish(),
        prerequisite_quantity: z.number().nullish()
    })
    .nullish();

const ProviderPrerequisiteToEntitlementPurchaseSchema = z
    .object({
        prerequisite_amount: z.string().nullish()
    })
    .nullish();

const ProviderPrerequisiteShippingPriceRangeSchema = z
    .object({
        less_than_or_equal_to: z.string().nullish()
    })
    .nullish();

const ProviderVariantIdPairSchema = z
    .object({
        product_id: z.string().nullish(),
        variant_id: z.string().nullish()
    })
    .nullish();

const ProviderPriceRuleSchema = z
    .object({
        id: z.string(),
        title: z.string().nullish(),
        value_type: z.string().nullish(),
        value: z.string().nullish(),
        target_type: z.string().nullish(),
        target_selection: z.string().nullish(),
        allocation_method: z.string().nullish(),
        usage_limit: z.number().nullish(),
        usage_per_customer: z.number().nullish(),
        starts_at: z.string().nullish(),
        ends_at: z.string().nullish(),
        create_at: z.string(),
        update_at: z.string(),
        note: z.string().nullish(),
        prerequisite_product_ids: z.array(z.string()).nullish(),
        prerequisite_variant_ids: z.array(ProviderVariantIdPairSchema).nullish(),
        prerequisite_collection_ids: z.array(z.string()).nullish(),
        prerequisite_customer_ids: z.array(z.string()).nullish(),
        prerequisite_saved_search_ids: z.array(z.string()).nullish(),
        entitled_product_ids: z.array(z.string()).nullish(),
        entitled_variant_ids: z.array(ProviderVariantIdPairSchema).nullish(),
        entitled_collection_ids: z.array(z.string()).nullish(),
        entitled_country_ids: z.array(z.string()).nullish(),
        sales_channels: z.array(z.string()).nullish(),
        prerequisite_subtotal_range: ProviderPrerequisiteSubtotalRangeSchema,
        prerequisite_quantity_range: ProviderPrerequisiteQuantityRangeSchema,
        prerequisite_to_entitlement_quantity_ratio: ProviderPrerequisiteToEntitlementQuantityRatioSchema,
        prerequisite_to_entitlement_purchase: ProviderPrerequisiteToEntitlementPurchaseSchema,
        prerequisite_shipping_price_range: ProviderPrerequisiteShippingPriceRangeSchema,
        recurring_cycle_limit: z.number().nullish(),
        allocation_limit: z.string().nullish(),
        joint_discount: z.boolean().nullish(),
        joint_discount_order: z.boolean().nullish(),
        joint_discount_product: z.boolean().nullish(),
        joint_discount_shipping: z.boolean().nullish(),
        overlay_discount_code: z.boolean().nullish(),
        overlay_discount_code_order: z.boolean().nullish(),
        overlay_discount_code_product: z.boolean().nullish(),
        overlay_discount_code_shipping: z.boolean().nullish()
    })
    .passthrough();

const PrerequisiteSubtotalRangeSchema = z
    .object({
        greater_than_or_equal_to: z.string().describe('The minimum required subtotal for the discount to apply.').optional()
    })
    .describe('The minimum subtotal required for the discount to be applied.');

const PrerequisiteQuantityRangeSchema = z
    .object({
        greater_than_or_equal_to: z.number().describe('The minimum quantity of items required for the discount to apply.').optional()
    })
    .describe('The minimum quantity of items required for the price rule to be applicable.');

const PrerequisiteToEntitlementQuantityRatioSchema = z
    .object({
        entitled_quantity: z.number().describe('The number of product Y being discounted.').optional(),
        prerequisite_quantity: z.number().describe('The minimum required quantity of product X.').optional()
    })
    .describe('Defines the Buy X Get Y ratio for the discount.');

const PrerequisiteToEntitlementPurchaseSchema = z
    .object({
        prerequisite_amount: z.string().describe('The minimum required subtotal of X products.').optional()
    })
    .describe('For Buy X Get Y discounts, defines the minimum total amount of product X required to apply the discount.');

const PrerequisiteShippingPriceRangeSchema = z
    .object({
        less_than_or_equal_to: z.string().describe('The maximum shipping price that qualifies for the discount.').optional()
    })
    .describe('If the discount is for free shipping, defines the maximum shipping amount eligible for the discount.');

const VariantIdPairSchema = z
    .object({
        product_id: z.string().describe('The product ID.').optional(),
        variant_id: z.string().describe('The product variant ID.').optional()
    })
    .describe('A product and variant ID pair for Buy X Get Y discount prerequisites or entitlements.');

const PriceRuleSchema = z
    .object({
        id: z.string().describe('The unique identifier for the price rule.'),
        title: z.string().describe('The title of the price rule, used for display to the buyer.').optional(),
        value_type: z.string().describe('Defines how the discount is applied. Valid values are "percentage" or "fixed_amount".').optional(),
        value: z
            .string()
            .describe(
                'The value of the price rule. If value_type is "percentage", this is the percentage value. If "fixed_amount", this is the monetary amount.'
            )
            .optional(),
        target_type: z.string().describe('The target type that the price rule applies to. Valid values are "line_item" or "shipping_line".').optional(),
        target_selection: z.string().describe('The product scope to which the price rule applies. Valid values are "all" or "entitled".').optional(),
        allocation_method: z.string().describe('The allocation method of the price rule. Valid values are "each" or "across".').optional(),
        usage_limit: z.number().describe('The maximum number of times the discount codes can be used.').optional(),
        usage_per_customer: z.number().describe('The maximum number of times each customer can use the discount.').optional(),
        starts_at: z.string().describe('The start date and time of the price rule in ISO 8601 format.').optional(),
        ends_at: z.string().describe('The end date and time of the price rule in ISO 8601 format.').optional(),
        create_at: z.string().describe('The date and time when the price rule was created in ISO 8601 format.'),
        update_at: z.string().describe('The date and time when the price rule was last updated in ISO 8601 format.'),
        note: z.string().describe('A note about the price rule.').optional(),
        prerequisite_product_ids: z.array(z.string()).describe('Product IDs required for Buy X Get Y discounts (product X).').optional(),
        prerequisite_variant_ids: z.array(VariantIdPairSchema).describe('Variant IDs required for Buy X Get Y discounts (product X).').optional(),
        prerequisite_collection_ids: z.array(z.string()).describe('Collection IDs required for Buy X Get Y discounts (product X).').optional(),
        prerequisite_customer_ids: z.array(z.string()).describe('Customer IDs that can use the discount.').optional(),
        prerequisite_saved_search_ids: z.array(z.string()).describe('Customer segment IDs that can use the discount.').optional(),
        entitled_product_ids: z.array(z.string()).describe('Product IDs entitled to the discount (product Y).').optional(),
        entitled_variant_ids: z.array(VariantIdPairSchema).describe('Variant IDs entitled to the discount (product Y).').optional(),
        entitled_collection_ids: z.array(z.string()).describe('Collection IDs entitled to the discount (product Y).').optional(),
        entitled_country_ids: z.array(z.string()).describe('Country or region IDs eligible for the discount.').optional(),
        sales_channels: z.array(z.string()).describe('Sales channels eligible for the discount.').optional(),
        prerequisite_subtotal_range: PrerequisiteSubtotalRangeSchema.describe('The minimum subtotal required for the discount to be applied.').optional(),
        prerequisite_quantity_range: PrerequisiteQuantityRangeSchema.describe(
            'The minimum quantity of items required for the price rule to be applicable.'
        ).optional(),
        prerequisite_to_entitlement_quantity_ratio: PrerequisiteToEntitlementQuantityRatioSchema.describe(
            'Defines the Buy X Get Y ratio for the discount.'
        ).optional(),
        prerequisite_to_entitlement_purchase: PrerequisiteToEntitlementPurchaseSchema.describe(
            'For Buy X Get Y discounts, defines the minimum total amount of product X required.'
        ).optional(),
        prerequisite_shipping_price_range: PrerequisiteShippingPriceRangeSchema.describe(
            'If the discount is for free shipping, defines the maximum shipping amount eligible for the discount.'
        ).optional(),
        recurring_cycle_limit: z.number().describe('Number of subscription billing cycles the discount applies to.').optional(),
        allocation_limit: z.string().describe('The maximum number of times the discount can be applied in a single order.').optional(),
        joint_discount: z.boolean().describe('Whether the price rule combines with all automatic discounts.').optional(),
        joint_discount_order: z.boolean().describe('Whether the price rule combines with order automatic discounts.').optional(),
        joint_discount_product: z.boolean().describe('Whether the price rule combines with product automatic discounts.').optional(),
        joint_discount_shipping: z.boolean().describe('Whether the price rule combines with shipping automatic discounts.').optional(),
        overlay_discount_code: z.boolean().describe('Whether the price rule combines with all discount codes.').optional(),
        overlay_discount_code_order: z.boolean().describe('Whether the price rule combines with order discount codes.').optional(),
        overlay_discount_code_product: z.boolean().describe('Whether the price rule combines with product discount codes.').optional(),
        overlay_discount_code_shipping: z.boolean().describe('Whether the price rule combines with shipping discount codes.').optional()
    })
    .describe('A discount price rule defining the value, scope, and eligibility conditions for discount codes.');

const sync = createSync({
    description: 'Sync discount price rules (the rule/scope/value definitions backing discount codes).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        PriceRule: PriceRuleSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/marketing/price-rule/retrieve-price-rules-list
            endpoint: '/admin/openapi/v20260601/sales/price_rules.json',
            params: checkpoint?.updated_after ? { update_at_min: checkpoint.updated_after } : {},
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                response_path: 'price_rules',
                limit: 50,
                limit_name_in_request: 'limit'
            },
            retries: 3
        };

        let maxUpdatedAt: string | undefined;

        for await (const page of nango.paginate(proxyConfig)) {
            const items = z.array(ProviderPriceRuleSchema).safeParse(page);
            if (!items.success) {
                throw new Error(`Invalid price rules response: ${items.error.message}`);
            }

            if (items.data.length === 0) {
                continue;
            }

            const priceRules = items.data.map((rule) => {
                const prerequisiteVariantIds = rule.prerequisite_variant_ids
                    ? rule.prerequisite_variant_ids
                          .map((item) => {
                              if (!item) {
                                  return undefined;
                              }
                              const obj: { product_id?: string; variant_id?: string } = {};
                              if (item.product_id != null) {
                                  obj.product_id = item.product_id;
                              }
                              if (item.variant_id != null) {
                                  obj.variant_id = item.variant_id;
                              }
                              return Object.keys(obj).length > 0 ? obj : undefined;
                          })
                          .filter((item) => item !== undefined)
                    : [];

                const entitledVariantIds = rule.entitled_variant_ids
                    ? rule.entitled_variant_ids
                          .map((item) => {
                              if (!item) {
                                  return undefined;
                              }
                              const obj: { product_id?: string; variant_id?: string } = {};
                              if (item.product_id != null) {
                                  obj.product_id = item.product_id;
                              }
                              if (item.variant_id != null) {
                                  obj.variant_id = item.variant_id;
                              }
                              return Object.keys(obj).length > 0 ? obj : undefined;
                          })
                          .filter((item) => item !== undefined)
                    : [];

                return {
                    id: rule.id,
                    ...(rule.title != null && { title: rule.title }),
                    ...(rule.value_type != null && { value_type: rule.value_type }),
                    ...(rule.value != null && { value: rule.value }),
                    ...(rule.target_type != null && { target_type: rule.target_type }),
                    ...(rule.target_selection != null && { target_selection: rule.target_selection }),
                    ...(rule.allocation_method != null && { allocation_method: rule.allocation_method }),
                    ...(rule.usage_limit != null && { usage_limit: rule.usage_limit }),
                    ...(rule.usage_per_customer != null && { usage_per_customer: rule.usage_per_customer }),
                    ...(rule.starts_at != null && { starts_at: rule.starts_at }),
                    ...(rule.ends_at != null && { ends_at: rule.ends_at }),
                    create_at: rule.create_at,
                    update_at: rule.update_at,
                    ...(rule.note != null && { note: rule.note }),
                    ...(rule.prerequisite_product_ids != null &&
                        rule.prerequisite_product_ids.length > 0 && {
                            prerequisite_product_ids: rule.prerequisite_product_ids
                        }),
                    ...(prerequisiteVariantIds.length > 0 && { prerequisite_variant_ids: prerequisiteVariantIds }),
                    ...(rule.prerequisite_collection_ids != null &&
                        rule.prerequisite_collection_ids.length > 0 && {
                            prerequisite_collection_ids: rule.prerequisite_collection_ids
                        }),
                    ...(rule.prerequisite_customer_ids != null &&
                        rule.prerequisite_customer_ids.length > 0 && {
                            prerequisite_customer_ids: rule.prerequisite_customer_ids
                        }),
                    ...(rule.prerequisite_saved_search_ids != null &&
                        rule.prerequisite_saved_search_ids.length > 0 && {
                            prerequisite_saved_search_ids: rule.prerequisite_saved_search_ids
                        }),
                    ...(rule.entitled_product_ids != null &&
                        rule.entitled_product_ids.length > 0 && {
                            entitled_product_ids: rule.entitled_product_ids
                        }),
                    ...(entitledVariantIds.length > 0 && { entitled_variant_ids: entitledVariantIds }),
                    ...(rule.entitled_collection_ids != null &&
                        rule.entitled_collection_ids.length > 0 && {
                            entitled_collection_ids: rule.entitled_collection_ids
                        }),
                    ...(rule.entitled_country_ids != null &&
                        rule.entitled_country_ids.length > 0 && {
                            entitled_country_ids: rule.entitled_country_ids
                        }),
                    ...(rule.sales_channels != null && rule.sales_channels.length > 0 && { sales_channels: rule.sales_channels }),
                    ...(rule.prerequisite_subtotal_range != null &&
                        rule.prerequisite_subtotal_range.greater_than_or_equal_to != null && {
                            prerequisite_subtotal_range: {
                                greater_than_or_equal_to: rule.prerequisite_subtotal_range.greater_than_or_equal_to
                            }
                        }),
                    ...(rule.prerequisite_quantity_range != null &&
                        rule.prerequisite_quantity_range.greater_than_or_equal_to != null && {
                            prerequisite_quantity_range: {
                                greater_than_or_equal_to: rule.prerequisite_quantity_range.greater_than_or_equal_to
                            }
                        }),
                    ...(rule.prerequisite_to_entitlement_quantity_ratio != null &&
                        (rule.prerequisite_to_entitlement_quantity_ratio.entitled_quantity != null ||
                            rule.prerequisite_to_entitlement_quantity_ratio.prerequisite_quantity != null) && {
                            prerequisite_to_entitlement_quantity_ratio: {
                                ...(rule.prerequisite_to_entitlement_quantity_ratio.entitled_quantity != null && {
                                    entitled_quantity: rule.prerequisite_to_entitlement_quantity_ratio.entitled_quantity
                                }),
                                ...(rule.prerequisite_to_entitlement_quantity_ratio.prerequisite_quantity != null && {
                                    prerequisite_quantity: rule.prerequisite_to_entitlement_quantity_ratio.prerequisite_quantity
                                })
                            }
                        }),
                    ...(rule.prerequisite_to_entitlement_purchase != null &&
                        rule.prerequisite_to_entitlement_purchase.prerequisite_amount != null && {
                            prerequisite_to_entitlement_purchase: {
                                prerequisite_amount: rule.prerequisite_to_entitlement_purchase.prerequisite_amount
                            }
                        }),
                    ...(rule.prerequisite_shipping_price_range != null &&
                        rule.prerequisite_shipping_price_range.less_than_or_equal_to != null && {
                            prerequisite_shipping_price_range: {
                                less_than_or_equal_to: rule.prerequisite_shipping_price_range.less_than_or_equal_to
                            }
                        }),
                    ...(rule.recurring_cycle_limit != null && { recurring_cycle_limit: rule.recurring_cycle_limit }),
                    ...(rule.allocation_limit != null && { allocation_limit: rule.allocation_limit }),
                    ...(rule.joint_discount != null && { joint_discount: rule.joint_discount }),
                    ...(rule.joint_discount_order != null && { joint_discount_order: rule.joint_discount_order }),
                    ...(rule.joint_discount_product != null && { joint_discount_product: rule.joint_discount_product }),
                    ...(rule.joint_discount_shipping != null && { joint_discount_shipping: rule.joint_discount_shipping }),
                    ...(rule.overlay_discount_code != null && { overlay_discount_code: rule.overlay_discount_code }),
                    ...(rule.overlay_discount_code_order != null && { overlay_discount_code_order: rule.overlay_discount_code_order }),
                    ...(rule.overlay_discount_code_product != null && { overlay_discount_code_product: rule.overlay_discount_code_product }),
                    ...(rule.overlay_discount_code_shipping != null && { overlay_discount_code_shipping: rule.overlay_discount_code_shipping })
                };
            });

            await nango.batchSave(priceRules, 'PriceRule');

            for (const rule of priceRules) {
                if (maxUpdatedAt === undefined || rule.update_at > maxUpdatedAt) {
                    maxUpdatedAt = rule.update_at;
                }
            }

            if (maxUpdatedAt !== undefined) {
                await nango.saveCheckpoint({ updated_after: maxUpdatedAt });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
