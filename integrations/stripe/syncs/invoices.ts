import { createSync } from 'nango';
import { z } from 'zod';

const InvoiceSchema = z.object({
    id: z.string(),
    status: z.string(),
    customer: z.string().optional(),
    subscription: z.string().optional(),
    amount_due: z.number().optional(),
    amount_paid: z.number().optional(),
    amount_remaining: z.number().optional(),
    currency: z.string().optional(),
    created: z.number().optional(),
    collection_method: z.string().optional(),
    description: z.string().optional(),
    due_date: z.number().optional(),
    hosted_invoice_url: z.string().optional(),
    invoice_pdf: z.string().optional(),
    number: z.string().optional(),
    billing_reason: z.string().optional(),
    period_start: z.number().optional(),
    period_end: z.number().optional(),
    subtotal: z.number().optional(),
    total: z.number().optional(),
    payment_intent: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    lines: z
        .object({
            object: z.string().optional(),
            data: z.array(z.unknown()).optional(),
            has_more: z.boolean().optional(),
            total_count: z.number().optional(),
            url: z.string().optional()
        })
        .passthrough()
        .optional(),
    automatic_tax: z
        .object({
            enabled: z.boolean().optional(),
            liability: z.string().optional(),
            status: z.string().optional()
        })
        .passthrough()
        .optional(),
    status_transitions: z
        .object({
            finalized_at: z.number().optional(),
            marked_uncollectible_at: z.number().optional(),
            paid_at: z.number().optional(),
            voided_at: z.number().optional()
        })
        .passthrough()
        .optional(),
    default_payment_method: z.string().optional(),
    default_source: z.string().optional(),
    discounts: z.array(z.unknown()).optional(),
    livemode: z.boolean().optional(),
    next_payment_attempt: z.number().optional(),
    on_behalf_of: z.string().optional(),
    receipt_number: z.string().optional(),
    starting_balance: z.number().optional(),
    ending_balance: z.number().optional(),
    post_payment_credit_notes_amount: z.number().optional(),
    pre_payment_credit_notes_amount: z.number().optional(),
    total_discount_amounts: z.array(z.unknown()).optional(),
    total_excluding_tax: z.number().optional(),
    total_taxes: z.array(z.unknown()).optional(),
    transfer_data: z.unknown().optional(),
    webhooks_delivered_at: z.number().optional(),
    attempt_count: z.number().optional(),
    attempted: z.boolean().optional(),
    auto_advance: z.boolean().optional()
});

const StripeListResponseSchema = z.object({
    object: z.string().optional(),
    url: z.string().optional(),
    has_more: z.boolean(),
    data: z.array(z.record(z.string(), z.unknown()))
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const LIMIT = 100;

function getString(obj: Record<string, unknown>, key: string): string | undefined {
    const val = obj[key];
    if (typeof val === 'string') {
        return val;
    }
    return undefined;
}

function getNumber(obj: Record<string, unknown>, key: string): number | undefined {
    const val = obj[key];
    if (typeof val === 'number') {
        return val;
    }
    return undefined;
}

function getBoolean(obj: Record<string, unknown>, key: string): boolean | undefined {
    const val = obj[key];
    if (typeof val === 'boolean') {
        return val;
    }
    return undefined;
}

function getObject(obj: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
    const val = obj[key];
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(val)) {
            result[k] = v;
        }
        return result;
    }
    return undefined;
}

function getArray(obj: Record<string, unknown>, key: string): unknown[] | undefined {
    const val = obj[key];
    if (Array.isArray(val)) {
        return val;
    }
    return undefined;
}

function cleanRecord(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value === null) {
            continue;
        }
        if (Array.isArray(value)) {
            result[key] = value.map((item) => {
                if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
                    const nested: Record<string, unknown> = {};
                    for (const [k, v] of Object.entries(item)) {
                        nested[k] = v;
                    }
                    return cleanRecord(nested);
                }
                return item;
            });
        } else if (typeof value === 'object' && value !== null) {
            const nested: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(value)) {
                nested[k] = v;
            }
            result[key] = cleanRecord(nested);
        } else {
            result[key] = value;
        }
    }
    return result;
}

function mapInvoice(raw: Record<string, unknown>): z.infer<typeof InvoiceSchema> {
    const cleaned = cleanRecord(raw);
    const id = getString(cleaned, 'id');
    const status = getString(cleaned, 'status');
    if (!id || !status) {
        throw new Error('Invoice is missing required id or status');
    }

    return {
        id,
        status,
        ...(getString(cleaned, 'customer') !== undefined && { customer: getString(cleaned, 'customer') }),
        ...(getString(cleaned, 'subscription') !== undefined && { subscription: getString(cleaned, 'subscription') }),
        ...(getNumber(cleaned, 'amount_due') !== undefined && { amount_due: getNumber(cleaned, 'amount_due') }),
        ...(getNumber(cleaned, 'amount_paid') !== undefined && { amount_paid: getNumber(cleaned, 'amount_paid') }),
        ...(getNumber(cleaned, 'amount_remaining') !== undefined && { amount_remaining: getNumber(cleaned, 'amount_remaining') }),
        ...(getString(cleaned, 'currency') !== undefined && { currency: getString(cleaned, 'currency') }),
        ...(getNumber(cleaned, 'created') !== undefined && { created: getNumber(cleaned, 'created') }),
        ...(getString(cleaned, 'collection_method') !== undefined && { collection_method: getString(cleaned, 'collection_method') }),
        ...(getString(cleaned, 'description') !== undefined && { description: getString(cleaned, 'description') }),
        ...(getNumber(cleaned, 'due_date') !== undefined && { due_date: getNumber(cleaned, 'due_date') }),
        ...(getString(cleaned, 'hosted_invoice_url') !== undefined && { hosted_invoice_url: getString(cleaned, 'hosted_invoice_url') }),
        ...(getString(cleaned, 'invoice_pdf') !== undefined && { invoice_pdf: getString(cleaned, 'invoice_pdf') }),
        ...(getString(cleaned, 'number') !== undefined && { number: getString(cleaned, 'number') }),
        ...(getString(cleaned, 'billing_reason') !== undefined && { billing_reason: getString(cleaned, 'billing_reason') }),
        ...(getNumber(cleaned, 'period_start') !== undefined && { period_start: getNumber(cleaned, 'period_start') }),
        ...(getNumber(cleaned, 'period_end') !== undefined && { period_end: getNumber(cleaned, 'period_end') }),
        ...(getNumber(cleaned, 'subtotal') !== undefined && { subtotal: getNumber(cleaned, 'subtotal') }),
        ...(getNumber(cleaned, 'total') !== undefined && { total: getNumber(cleaned, 'total') }),
        ...(getString(cleaned, 'payment_intent') !== undefined && { payment_intent: getString(cleaned, 'payment_intent') }),
        ...(getObject(cleaned, 'metadata') !== undefined && { metadata: getObject(cleaned, 'metadata') }),
        ...(getObject(cleaned, 'lines') !== undefined && { lines: getObject(cleaned, 'lines') }),
        ...(getObject(cleaned, 'automatic_tax') !== undefined && { automatic_tax: getObject(cleaned, 'automatic_tax') }),
        ...(getObject(cleaned, 'status_transitions') !== undefined && { status_transitions: getObject(cleaned, 'status_transitions') }),
        ...(getString(cleaned, 'default_payment_method') !== undefined && { default_payment_method: getString(cleaned, 'default_payment_method') }),
        ...(getString(cleaned, 'default_source') !== undefined && { default_source: getString(cleaned, 'default_source') }),
        ...(getArray(cleaned, 'discounts') !== undefined && { discounts: getArray(cleaned, 'discounts') }),
        ...(getBoolean(cleaned, 'livemode') !== undefined && { livemode: getBoolean(cleaned, 'livemode') }),
        ...(getNumber(cleaned, 'next_payment_attempt') !== undefined && { next_payment_attempt: getNumber(cleaned, 'next_payment_attempt') }),
        ...(getString(cleaned, 'on_behalf_of') !== undefined && { on_behalf_of: getString(cleaned, 'on_behalf_of') }),
        ...(getString(cleaned, 'receipt_number') !== undefined && { receipt_number: getString(cleaned, 'receipt_number') }),
        ...(getNumber(cleaned, 'starting_balance') !== undefined && { starting_balance: getNumber(cleaned, 'starting_balance') }),
        ...(getNumber(cleaned, 'ending_balance') !== undefined && { ending_balance: getNumber(cleaned, 'ending_balance') }),
        ...(getNumber(cleaned, 'post_payment_credit_notes_amount') !== undefined && {
            post_payment_credit_notes_amount: getNumber(cleaned, 'post_payment_credit_notes_amount')
        }),
        ...(getNumber(cleaned, 'pre_payment_credit_notes_amount') !== undefined && {
            pre_payment_credit_notes_amount: getNumber(cleaned, 'pre_payment_credit_notes_amount')
        }),
        ...(getArray(cleaned, 'total_discount_amounts') !== undefined && { total_discount_amounts: getArray(cleaned, 'total_discount_amounts') }),
        ...(getNumber(cleaned, 'total_excluding_tax') !== undefined && { total_excluding_tax: getNumber(cleaned, 'total_excluding_tax') }),
        ...(getArray(cleaned, 'total_taxes') !== undefined && { total_taxes: getArray(cleaned, 'total_taxes') }),
        ...(getObject(cleaned, 'transfer_data') !== undefined && { transfer_data: getObject(cleaned, 'transfer_data') }),
        ...(getNumber(cleaned, 'webhooks_delivered_at') !== undefined && { webhooks_delivered_at: getNumber(cleaned, 'webhooks_delivered_at') }),
        ...(getNumber(cleaned, 'attempt_count') !== undefined && { attempt_count: getNumber(cleaned, 'attempt_count') }),
        ...(getBoolean(cleaned, 'attempted') !== undefined && { attempted: getBoolean(cleaned, 'attempted') }),
        ...(getBoolean(cleaned, 'auto_advance') !== undefined && { auto_advance: getBoolean(cleaned, 'auto_advance') })
    };
}

const sync = createSync({
    description: 'Sync invoices from Stripe.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/invoices'
        }
    ],
    models: {
        Invoice: InvoiceSchema
    },

    exec: async (nango) => {
        const checkpointResult = await nango.getCheckpoint();
        const checkpoint = checkpointResult ? CheckpointSchema.safeParse(checkpointResult) : null;
        if (checkpoint && !checkpoint.success) {
            throw new Error('Invalid checkpoint: ' + checkpoint.error.message);
        }

        let cursor = checkpoint?.data.cursor ?? '';

        // Stripe uses `has_more: boolean` and the next cursor is the last item's ID.
        // Nango's built-in cursor paginator expects a string/number cursor in the response body,
        // so a manual loop is required to read the envelope and compute the next cursor.
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
        while (true) {
            const config = {
                // https://docs.stripe.com/api/invoices/list
                endpoint: '/v1/invoices',
                params: {
                    limit: LIMIT,
                    ...(cursor.length > 0 && { starting_after: cursor })
                },
                retries: 3
            };

            const response = await nango.get(config);

            const parsed = StripeListResponseSchema.parse(response.data);
            const invoices = parsed.data;

            if (invoices.length === 0) {
                break;
            }

            const mappedInvoices = invoices.map(mapInvoice);
            await nango.batchSave(mappedInvoices, 'Invoice');

            const lastInvoice = invoices[invoices.length - 1];
            if (!parsed.has_more || !lastInvoice) {
                break;
            }

            const lastId = getString(lastInvoice, 'id');
            if (!lastId) {
                throw new Error('Last invoice is missing id');
            }

            cursor = lastId;
            await nango.saveCheckpoint({ cursor });
        }

        await nango.saveCheckpoint({ cursor: '' });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
