import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MoneySchema = z
    .object({
        currency_code: z.string().optional(),
        value: z.string().optional()
    })
    .passthrough();

const FrequencySchema = z
    .object({
        interval_unit: z.string().optional(),
        interval_count: z.number().optional()
    })
    .passthrough();

const PricingSchemeSchema = z
    .object({
        fixed_price: MoneySchema.optional(),
        pricing_model: z.string().optional(),
        version: z.number().optional(),
        create_time: z.string().optional(),
        update_time: z.string().optional()
    })
    .passthrough();

const BillingCycleSchema = z
    .object({
        frequency: FrequencySchema.optional(),
        tenure_type: z.string().optional(),
        sequence: z.number().optional(),
        total_cycles: z.number().optional(),
        pricing_scheme: PricingSchemeSchema.optional(),
        create_time: z.string().optional(),
        update_time: z.string().optional()
    })
    .passthrough();

const PaymentPreferencesSchema = z
    .object({
        auto_bill_outstanding: z.boolean().optional(),
        setup_fee: MoneySchema.optional(),
        setup_fee_failure_action: z.string().optional(),
        payment_failure_threshold: z.number().optional()
    })
    .passthrough();

const TaxesSchema = z
    .object({
        percentage: z.string().optional(),
        inclusive: z.boolean().optional()
    })
    .passthrough();

const ProviderPlanSchema = z
    .object({
        id: z.string(),
        product_id: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        usage_type: z.string().optional(),
        create_time: z.string().optional(),
        update_time: z.string().optional(),
        billing_cycles: z.array(BillingCycleSchema).optional(),
        payment_preferences: PaymentPreferencesSchema.optional(),
        taxes: TaxesSchema.optional(),
        quantity_supported: z.boolean().optional()
    })
    .passthrough();

const PlanSchema = z.object({
    id: z.string(),
    product_id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    usage_type: z.string().optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    billing_cycles: z.array(BillingCycleSchema).optional(),
    payment_preferences: PaymentPreferencesSchema.optional(),
    taxes: TaxesSchema.optional(),
    quantity_supported: z.boolean().optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync plans.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Plan: PlanSchema
    },

    exec: async (nango) => {
        // PayPal's billing plans list only supports page-based pagination with no changed-since filter, so
        // every run must page through the whole catalog. The page checkpoint lets an interrupted run (large
        // number of plans, execution time limit) resume pagination instead of restarting from page 1;
        // trackDeletesStart is safe/idempotent to call again on a resumed run, and trackDeletesEnd only fires
        // once the full catalog has actually been enumerated.
        const checkpoint = await nango.getCheckpoint();
        let page = checkpoint?.page ?? 1;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.paypal.com/docs/api/subscriptions/v1/#plans_list
            endpoint: '/v1/billing/plans',
            headers: {
                Prefer: 'return=representation'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'page_size',
                limit: 20,
                response_path: 'plans',
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : page;
                    await nango.saveCheckpoint({ page });
                }
            },
            retries: 3
        };

        await nango.trackDeletesStart('Plan');

        for await (const pageItems of nango.paginate(proxyConfig)) {
            const plans = pageItems.map((item: unknown) => {
                const parsed = ProviderPlanSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse plan: ${parsed.error.message}`);
                }
                const plan = parsed.data;
                return {
                    id: plan.id,
                    ...(plan.product_id !== undefined && { product_id: plan.product_id }),
                    ...(plan.name !== undefined && { name: plan.name }),
                    ...(plan.description !== undefined && { description: plan.description }),
                    ...(plan.status !== undefined && { status: plan.status }),
                    ...(plan.usage_type !== undefined && { usage_type: plan.usage_type }),
                    ...(plan.create_time !== undefined && { create_time: plan.create_time }),
                    ...(plan.update_time !== undefined && { update_time: plan.update_time }),
                    ...(plan.billing_cycles !== undefined && { billing_cycles: plan.billing_cycles }),
                    ...(plan.payment_preferences !== undefined && { payment_preferences: plan.payment_preferences }),
                    ...(plan.taxes !== undefined && { taxes: plan.taxes }),
                    ...(plan.quantity_supported !== undefined && { quantity_supported: plan.quantity_supported })
                };
            });

            if (plans.length === 0) {
                continue;
            }

            await nango.batchSave(plans, 'Plan');
        }

        await nango.trackDeletesEnd('Plan');
        // Full catalog enumerated: reset the cursor so the next scheduled run starts a fresh pass from page 1.
        await nango.saveCheckpoint({ page: 1 });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
