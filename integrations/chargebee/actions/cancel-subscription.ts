import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    subscription_id: z.string().describe('Chargebee subscription ID. Example: "AzqOd0VMyVsW3aOz"'),
    end_of_term: z
        .boolean()
        .optional()
        .describe('If true, the subscription is set to non_renewing and will cancel at the end of the current term. If false, it is cancelled immediately.'),
    credit_option_for_current_term_charges: z.enum(['prorate', 'full', 'none']).optional().describe('How to handle charges for the current term.')
});

const SubscriptionItemSchema = z.object({
    item_price_id: z.string().optional(),
    item_type: z.string().optional(),
    quantity: z.number().optional(),
    unit_price: z.number().optional(),
    amount: z.number().optional(),
    free_quantity: z.number().optional(),
    trial_end: z.number().optional(),
    billing_cycles: z.number().optional(),
    service_period_days: z.number().optional(),
    charge_on_event: z.string().optional(),
    charge_once: z.boolean().optional(),
    charge_on_option: z.string().optional()
});

const ProviderSubscriptionSchema = z.object({
    id: z.string(),
    status: z.string(),
    customer_id: z.string().optional(),
    plan_id: z.string().optional(),
    plan_unit_price: z.number().optional(),
    plan_amount: z.number().optional(),
    billing_period: z.number().optional(),
    billing_period_unit: z.string().optional(),
    subscription_items: z.array(SubscriptionItemSchema).optional(),
    created_at: z.number().optional(),
    started_at: z.number().optional(),
    activated_at: z.number().optional(),
    cancelled_at: z.number().optional(),
    pause_date: z.number().optional(),
    resume_date: z.number().optional(),
    due_invoices_count: z.number().optional(),
    due_since: z.number().optional(),
    total_dues: z.number().optional(),
    mrr: z.number().optional(),
    exchange_rate: z.number().optional(),
    base_currency_code: z.string().optional(),
    has_scheduled_changes: z.boolean().optional(),
    channel: z.string().optional(),
    resource_version: z.number().optional(),
    updated_at: z.number().optional(),
    deleted: z.boolean().optional(),
    object: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    customer_id: z.string().optional(),
    plan_id: z.string().optional(),
    plan_unit_price: z.number().optional(),
    plan_amount: z.number().optional(),
    billing_period: z.number().optional(),
    billing_period_unit: z.string().optional(),
    subscription_items: z.array(SubscriptionItemSchema).optional(),
    created_at: z.number().optional(),
    started_at: z.number().optional(),
    activated_at: z.number().optional(),
    cancelled_at: z.number().optional(),
    pause_date: z.number().optional(),
    resume_date: z.number().optional(),
    due_invoices_count: z.number().optional(),
    due_since: z.number().optional(),
    total_dues: z.number().optional(),
    mrr: z.number().optional(),
    exchange_rate: z.number().optional(),
    base_currency_code: z.string().optional(),
    has_scheduled_changes: z.boolean().optional(),
    channel: z.string().optional(),
    resource_version: z.number().optional(),
    updated_at: z.number().optional(),
    deleted: z.boolean().optional()
});

const action = createAction({
    description: 'Cancel a subscription (Product Catalog 2.0).',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/cancel-subscription'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};

        if (input.end_of_term !== undefined) {
            params['end_of_term'] = String(input.end_of_term);
        }

        if (input.credit_option_for_current_term_charges !== undefined) {
            params['credit_option_for_current_term_charges'] = input.credit_option_for_current_term_charges;
        }

        // https://apidocs.chargebee.com/docs/api/subscriptions?lang=curl#cancel_a_subscription_for_items
        const response = await nango.post({
            endpoint: `/api/v2/subscriptions/${encodeURIComponent(input.subscription_id)}/cancel_for_items`,
            params,
            retries: 3
        });

        const raw = response.data;

        if (!raw || typeof raw !== 'object' || !('subscription' in raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Chargebee response did not contain a subscription object.'
            });
        }

        const providerSubscription = ProviderSubscriptionSchema.parse(raw.subscription);

        return {
            id: providerSubscription.id,
            status: providerSubscription.status,
            ...(providerSubscription.customer_id !== undefined && { customer_id: providerSubscription.customer_id }),
            ...(providerSubscription.plan_id !== undefined && { plan_id: providerSubscription.plan_id }),
            ...(providerSubscription.plan_unit_price !== undefined && { plan_unit_price: providerSubscription.plan_unit_price }),
            ...(providerSubscription.plan_amount !== undefined && { plan_amount: providerSubscription.plan_amount }),
            ...(providerSubscription.billing_period !== undefined && { billing_period: providerSubscription.billing_period }),
            ...(providerSubscription.billing_period_unit !== undefined && { billing_period_unit: providerSubscription.billing_period_unit }),
            ...(providerSubscription.subscription_items !== undefined && { subscription_items: providerSubscription.subscription_items }),
            ...(providerSubscription.created_at !== undefined && { created_at: providerSubscription.created_at }),
            ...(providerSubscription.started_at !== undefined && { started_at: providerSubscription.started_at }),
            ...(providerSubscription.activated_at !== undefined && { activated_at: providerSubscription.activated_at }),
            ...(providerSubscription.cancelled_at !== undefined && { cancelled_at: providerSubscription.cancelled_at }),
            ...(providerSubscription.pause_date !== undefined && { pause_date: providerSubscription.pause_date }),
            ...(providerSubscription.resume_date !== undefined && { resume_date: providerSubscription.resume_date }),
            ...(providerSubscription.due_invoices_count !== undefined && { due_invoices_count: providerSubscription.due_invoices_count }),
            ...(providerSubscription.due_since !== undefined && { due_since: providerSubscription.due_since }),
            ...(providerSubscription.total_dues !== undefined && { total_dues: providerSubscription.total_dues }),
            ...(providerSubscription.mrr !== undefined && { mrr: providerSubscription.mrr }),
            ...(providerSubscription.exchange_rate !== undefined && { exchange_rate: providerSubscription.exchange_rate }),
            ...(providerSubscription.base_currency_code !== undefined && { base_currency_code: providerSubscription.base_currency_code }),
            ...(providerSubscription.has_scheduled_changes !== undefined && { has_scheduled_changes: providerSubscription.has_scheduled_changes }),
            ...(providerSubscription.channel !== undefined && { channel: providerSubscription.channel }),
            ...(providerSubscription.resource_version !== undefined && { resource_version: providerSubscription.resource_version }),
            ...(providerSubscription.updated_at !== undefined && { updated_at: providerSubscription.updated_at }),
            ...(providerSubscription.deleted !== undefined && { deleted: providerSubscription.deleted })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
