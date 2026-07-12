import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderEmailSettingsSchema = z.object({
    recipients: z.array(z.string()),
    billing_email_template: z
        .object({
            id: z.number(),
            label: z.string()
        })
        .nullable()
});

const ProviderRecurringRuleSchema = z.object({
    day_of_month: z.array(z.number()).nullable(),
    month_of_year: z.array(z.number()).nullable(),
    week_start: z.number().nullable(),
    day: z.array(z.number()).nullable(),
    rule_type: z.string(),
    interval: z.number().nullable(),
    count: z.number().nullable(),
    until: z.string().nullable()
});

const ProviderCustomerSchema = z.object({
    id: z.number(),
    url: z.string()
});

const ProviderCustomerInvoiceDataSchema = z.object({
    label: z.string().nullable(),
    currency: z.string(),
    amount: z.string(),
    currency_amount: z.string(),
    currency_amount_before_tax: z.string(),
    exchange_rate: z.string(),
    currency_tax: z.string(),
    language: z.string(),
    customer_invoice_template: z
        .object({
            id: z.number()
        })
        .nullable(),
    discount: z.object({
        type: z.string(),
        value: z.string().nullable()
    }),
    pdf_invoice_free_text: z.string(),
    pdf_invoice_subject: z.string(),
    pdf_description: z.string().nullable(),
    special_mention: z.string().nullable(),
    invoice_line_sections: z.object({
        url: z.string()
    }),
    invoice_lines: z.object({
        url: z.string()
    })
});

const ProviderBillingSubscriptionSchema = z.object({
    id: z.number(),
    next_occurrence: z.string().nullable(),
    prev_occurrence: z.string().nullable(),
    stopped_at: z.string().nullable(),
    start: z.string().nullable(),
    finish: z.string().nullable(),
    status: z.string(),
    mode: z.string(),
    activated_at: z.string().nullable(),
    payment_conditions: z.string().nullable(),
    payment_method: z.string(),
    label: z.string().nullable(),
    email_settings: ProviderEmailSettingsSchema.nullable(),
    recurring_rule: ProviderRecurringRuleSchema,
    customer: ProviderCustomerSchema.nullable(),
    customer_invoice_data: ProviderCustomerInvoiceDataSchema,
    created_at: z.string(),
    updated_at: z.string()
});

const BillingSubscriptionSchema = z.object({
    id: z.string(),
    next_occurrence: z.string().optional(),
    prev_occurrence: z.string().optional(),
    stopped_at: z.string().optional(),
    start: z.string().optional(),
    finish: z.string().optional(),
    status: z.string(),
    mode: z.string(),
    activated_at: z.string().optional(),
    payment_conditions: z.string().optional(),
    payment_method: z.string(),
    label: z.string().optional(),
    email_settings: ProviderEmailSettingsSchema.optional(),
    recurring_rule: ProviderRecurringRuleSchema,
    customer_id: z.string().optional(),
    customer_url: z.string().optional(),
    customer_invoice_data: ProviderCustomerInvoiceDataSchema,
    created_at: z.string(),
    updated_at: z.string()
});

const sync = createSync({
    description: 'Sync billing subscriptions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        BillingSubscription: BillingSubscriptionSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes /billing_subscriptions with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor.
        await nango.trackDeletesStart('BillingSubscription');

        const proxyConfig: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getbillingsubscriptions.md
            endpoint: '/api/external/v2/billing_subscriptions',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const validatedPage = z.array(ProviderBillingSubscriptionSchema).parse(page);
            const subscriptions = validatedPage.map((record) => ({
                id: String(record.id),
                ...(record.next_occurrence !== null && { next_occurrence: record.next_occurrence }),
                ...(record.prev_occurrence !== null && { prev_occurrence: record.prev_occurrence }),
                ...(record.stopped_at !== null && { stopped_at: record.stopped_at }),
                ...(record.start !== null && { start: record.start }),
                ...(record.finish !== null && { finish: record.finish }),
                status: record.status,
                mode: record.mode,
                ...(record.activated_at !== null && { activated_at: record.activated_at }),
                ...(record.payment_conditions !== null && { payment_conditions: record.payment_conditions }),
                payment_method: record.payment_method,
                ...(record.label !== null && { label: record.label }),
                ...(record.email_settings !== null && { email_settings: record.email_settings }),
                recurring_rule: record.recurring_rule,
                ...(record.customer !== null && {
                    customer_id: String(record.customer.id),
                    customer_url: record.customer.url
                }),
                customer_invoice_data: record.customer_invoice_data,
                created_at: record.created_at,
                updated_at: record.updated_at
            }));

            if (subscriptions.length > 0) {
                await nango.batchSave(subscriptions, 'BillingSubscription');
            }
        }

        await nango.trackDeletesEnd('BillingSubscription');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
