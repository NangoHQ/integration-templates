// Generated by ts-to-zod
import { z } from 'zod';

export const cancellationDetailsSchema = z.object({
    comment: z.string().nullable(),
    feedback: z.string().nullable(),
    reason: z.string().nullable()
});

export const issuerSchema = z.object({
    type: z.string()
});

export const invoiceSettingsSchema = z.object({
    issuer: issuerSchema,
    account_tax_ids: z.union([z.string(), z.array(z.string())]).nullable()
});

export const planSchema = z.object({
    id: z.string(),
    object: z.string(),
    active: z.boolean(),
    aggregate_usage: z.any(),
    amount: z.number(),
    amount_decimal: z.string(),
    billing_scheme: z.string(),
    created: z.number(),
    currency: z.string(),
    discounts: z.any(),
    interval: z.string(),
    interval_count: z.number(),
    livemode: z.boolean(),
    nickname: z.any(),
    product: z.string(),
    tiers_mode: z.any(),
    transform_usage: z.any(),
    trial_period_days: z.any(),
    usage_type: z.string()
});

export const recurringSchema = z.object({
    aggregate_usage: z.any(),
    interval: z.string(),
    interval_count: z.number(),
    trial_period_days: z.any(),
    usage_type: z.string()
});

export const priceSchema = z.object({
    id: z.string(),
    object: z.string(),
    active: z.boolean(),
    billing_scheme: z.string(),
    created: z.number(),
    currency: z.string(),
    custom_unit_amount: z.any(),
    livemode: z.boolean(),
    lookup_key: z.any(),
    nickname: z.any(),
    product: z.string(),
    recurring: recurringSchema,
    tax_behavior: z.string(),
    tiers_mode: z.any(),
    transform_quantity: z.any(),
    type: z.string(),
    unit_amount: z.number(),
    unit_amount_decimal: z.string()
});

export const itemSchema = z.object({
    id: z.string(),
    billing_thresholds: z.string().nullable(),
    created: z.number(),
    plan: planSchema,
    price: priceSchema,
    quantity: z.number(),
    subscription: z.string(),
    tax_rates: z.array(z.string())
});

export const paymentSettingsSchema = z.object({
    payment_method_options: z.string().nullable(),
    payment_method_types: z.string().nullable(),
    save_default_payment_method: z.string()
});

export const endBehaviorSchema = z.object({
    missing_payment_method: z.string()
});

export const trialSettingsSchema = z.object({
    end_behavior: endBehaviorSchema
});

export const subscriptionSchema = z.object({
    id: z.string(),
    automatic_tax: z.object({
        enabled: z.boolean(),
        liability: z.union([z.boolean(), z.string()]).nullable(),
        disabled_reason: z.string().nullable()
    }),
    billing_cycle_anchor: z.number(),
    billing_thresholds: z.string().nullable(),
    cancel_at: z.string().nullable(),
    cancel_at_period_end: z.boolean(),
    canceled_at: z.string().nullable(),
    cancellation_details: cancellationDetailsSchema,
    collection_method: z.string(),
    created: z.number(),
    currency: z.string(),
    current_period_end: z.number(),
    current_period_start: z.number(),
    customer: z.string(),
    days_until_due: z.number().nullable(),
    default_payment_method: z.string().nullable(),
    description: z.string().nullable(),
    discount: z.string().nullable(),
    discounts: z.array(z.string()).nullable(),
    ended_at: z.string().nullable(),
    invoice_settings: invoiceSettingsSchema,
    items: z.array(itemSchema),
    latest_invoice: z.string(),
    livemode: z.boolean(),
    next_pending_invoice_item_invoice: z.string().nullable(),
    on_behalf_of: z.string().nullable(),
    pause_collection: z.string().nullable(),
    payment_settings: paymentSettingsSchema,
    pending_invoice_item_interval: z.string().nullable(),
    pending_setup_intent: z.string().nullable(),
    schedule: z.string().nullable(),
    start_date: z.number(),
    status: z.string(),
    transfer_data: z.string().nullable(),
    trial_end: z.string().nullable(),
    trial_settings: trialSettingsSchema,
    trial_start: z.string().nullable()
});