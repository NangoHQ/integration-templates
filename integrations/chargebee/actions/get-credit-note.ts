import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    credit_note_id: z.string().describe('Credit note ID. Example: "__demo_cn__7"')
});

const CreditNoteSchema = z
    .object({
        id: z.string(),
        customer_id: z.string(),
        subscription_id: z.string().nullable().optional(),
        reference_invoice_id: z.string().nullable().optional(),
        type: z.string(),
        status: z.string(),
        reason_code: z.string().nullable().optional(),
        create_reason_code: z.string().nullable().optional(),
        currency_code: z.string(),
        price_type: z.string(),
        total: z.number().optional(),
        sub_total: z.number(),
        amount_allocated: z.number().optional(),
        amount_refunded: z.number().optional(),
        amount_available: z.number().optional(),
        date: z.number().optional(),
        updated_at: z.number().optional(),
        deleted: z.boolean(),
        resource_version: z.number().optional(),
        line_items: z.array(z.record(z.string(), z.unknown())).optional(),
        discounts: z.array(z.record(z.string(), z.unknown())).optional(),
        taxes: z.array(z.record(z.string(), z.unknown())).optional(),
        allocations: z.array(z.record(z.string(), z.unknown())).optional(),
        linked_refunds: z.array(z.record(z.string(), z.unknown())).optional(),
        billing_address: z.record(z.string(), z.unknown()).optional(),
        shipping_address: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    credit_note: z.unknown()
});

const OutputSchema = z
    .object({
        id: z.string(),
        customer_id: z.string(),
        subscription_id: z.string().optional(),
        reference_invoice_id: z.string().optional(),
        type: z.string(),
        status: z.string(),
        reason_code: z.string().optional(),
        create_reason_code: z.string().optional(),
        currency_code: z.string(),
        price_type: z.string(),
        total: z.number().optional(),
        sub_total: z.number(),
        amount_allocated: z.number().optional(),
        amount_refunded: z.number().optional(),
        amount_available: z.number().optional(),
        date: z.number().optional(),
        updated_at: z.number().optional(),
        deleted: z.boolean(),
        resource_version: z.number().optional(),
        line_items: z.array(z.record(z.string(), z.unknown())).optional(),
        discounts: z.array(z.record(z.string(), z.unknown())).optional(),
        taxes: z.array(z.record(z.string(), z.unknown())).optional(),
        allocations: z.array(z.record(z.string(), z.unknown())).optional(),
        linked_refunds: z.array(z.record(z.string(), z.unknown())).optional(),
        billing_address: z.record(z.string(), z.unknown()).optional(),
        shipping_address: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single credit note by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://apidocs.chargebee.com/docs/api/credit_notes/retrieve-a-credit-note
            endpoint: `/api/v2/credit_notes/${encodeURIComponent(input.credit_note_id)}`,
            retries: 3
        });

        const raw = ProviderResponseSchema.parse(response.data);
        const provider = CreditNoteSchema.parse(raw.credit_note);

        return {
            id: provider.id,
            customer_id: provider.customer_id,
            type: provider.type,
            status: provider.status,
            currency_code: provider.currency_code,
            price_type: provider.price_type,
            sub_total: provider.sub_total,
            deleted: provider.deleted,
            ...(provider.subscription_id != null && { subscription_id: provider.subscription_id }),
            ...(provider.reference_invoice_id != null && { reference_invoice_id: provider.reference_invoice_id }),
            ...(provider.reason_code != null && { reason_code: provider.reason_code }),
            ...(provider.create_reason_code != null && { create_reason_code: provider.create_reason_code }),
            ...(provider.total !== undefined && { total: provider.total }),
            ...(provider.amount_allocated !== undefined && { amount_allocated: provider.amount_allocated }),
            ...(provider.amount_refunded !== undefined && { amount_refunded: provider.amount_refunded }),
            ...(provider.amount_available !== undefined && { amount_available: provider.amount_available }),
            ...(provider.date !== undefined && { date: provider.date }),
            ...(provider.updated_at !== undefined && { updated_at: provider.updated_at }),
            ...(provider.resource_version !== undefined && { resource_version: provider.resource_version }),
            ...(provider.line_items !== undefined && { line_items: provider.line_items }),
            ...(provider.discounts !== undefined && { discounts: provider.discounts }),
            ...(provider.taxes !== undefined && { taxes: provider.taxes }),
            ...(provider.allocations !== undefined && { allocations: provider.allocations }),
            ...(provider.linked_refunds !== undefined && { linked_refunds: provider.linked_refunds }),
            ...(provider.billing_address !== undefined && { billing_address: provider.billing_address }),
            ...(provider.shipping_address !== undefined && { shipping_address: provider.shipping_address }),
            ...Object.fromEntries(
                Object.entries(provider).filter(([key, value]) => {
                    const knownKeys = [
                        'id',
                        'customer_id',
                        'subscription_id',
                        'reference_invoice_id',
                        'type',
                        'status',
                        'reason_code',
                        'create_reason_code',
                        'currency_code',
                        'price_type',
                        'total',
                        'sub_total',
                        'amount_allocated',
                        'amount_refunded',
                        'amount_available',
                        'date',
                        'updated_at',
                        'deleted',
                        'resource_version',
                        'line_items',
                        'discounts',
                        'taxes',
                        'allocations',
                        'linked_refunds',
                        'billing_address',
                        'shipping_address'
                    ];
                    return !knownKeys.includes(key) && value !== null && value !== undefined;
                })
            )
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
