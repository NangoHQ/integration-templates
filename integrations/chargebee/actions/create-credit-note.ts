import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    reference_invoice_id: z.string().describe('Invoice ID against which the credit note is issued. Example: "1"'),
    type: z.enum(['adjustment', 'refundable']).describe('Type of credit note.'),
    reason_code: z
        .enum(['write_off', 'subscription_change', 'subscription_cancellation', 'chargeback', 'order_change', 'other'])
        .optional()
        .describe('Reason for issuing the credit note.'),
    total: z.number().optional().describe('Total credit note amount in cents. Required if line_items is not provided.'),
    line_items: z
        .array(
            z.object({
                reference_line_item_id: z.string().optional(),
                unit_amount: z.number().optional(),
                quantity: z.number().optional(),
                amount: z.number().optional(),
                description: z.string().optional()
            })
        )
        .optional()
        .describe('Line items for the credit note. Flattened into bracket notation query params.'),
    notes: z.string().optional().describe('Customer-facing notes for the credit note.')
});

const ProviderCreditNoteSchema = z.object({
    id: z.string(),
    reference_invoice_id: z.string().optional(),
    type: z.string(),
    status: z.string(),
    total: z.number().optional(),
    amount_allocated: z.number().optional(),
    amount_available: z.number().optional(),
    amount_refunded: z.number().optional(),
    reason_code: z.string().optional(),
    notes: z.array(z.string()).optional(),
    customer_id: z.string().optional(),
    deleted: z.boolean(),
    date: z.number().optional(),
    updated_at: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    reference_invoice_id: z.string().optional(),
    type: z.string(),
    status: z.string(),
    total: z.number().optional(),
    amount_allocated: z.number().optional(),
    amount_available: z.number().optional(),
    amount_refunded: z.number().optional(),
    reason_code: z.string().optional(),
    notes: z.array(z.string()).optional(),
    customer_id: z.string().optional(),
    deleted: z.boolean(),
    date: z.number().optional(),
    updated_at: z.number().optional()
});

const action = createAction({
    description: 'Create a credit note against an invoice.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/actions/create-credit-note' },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            reference_invoice_id: input.reference_invoice_id,
            type: input.type
        };

        if (input.reason_code !== undefined) {
            params['reason_code'] = input.reason_code;
        }

        if (input.total !== undefined) {
            params['total'] = input.total;
        }

        if (input.notes !== undefined) {
            params['customer_notes'] = input.notes;
        }

        if (input.line_items !== undefined) {
            for (let i = 0; i < input.line_items.length; i++) {
                const item = input.line_items[i];
                if (item === undefined) {
                    continue;
                }
                if (item.reference_line_item_id !== undefined) {
                    params[`line_items[reference_line_item_id][${i}]`] = item.reference_line_item_id;
                }
                if (item.unit_amount !== undefined) {
                    params[`line_items[unit_amount][${i}]`] = item.unit_amount;
                }
                if (item.quantity !== undefined) {
                    params[`line_items[quantity][${i}]`] = item.quantity;
                }
                if (item.amount !== undefined) {
                    params[`line_items[amount][${i}]`] = item.amount;
                }
                if (item.description !== undefined) {
                    params[`line_items[description][${i}]`] = item.description;
                }
            }
        }

        const config: ProxyConfiguration = {
            // https://apidocs.chargebee.com/docs/api/credit_notes/create-credit-note
            endpoint: '/api/v2/credit_notes',
            params,
            retries: 1
        };

        const response = await nango.post(config);

        if (typeof response.data !== 'object' || response.data === null || !('credit_note' in response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Chargebee API'
            });
        }

        const providerCreditNote = ProviderCreditNoteSchema.parse(response.data.credit_note);

        return {
            id: providerCreditNote.id,
            reference_invoice_id: providerCreditNote.reference_invoice_id,
            type: providerCreditNote.type,
            status: providerCreditNote.status,
            total: providerCreditNote.total,
            amount_allocated: providerCreditNote.amount_allocated,
            amount_available: providerCreditNote.amount_available,
            amount_refunded: providerCreditNote.amount_refunded,
            reason_code: providerCreditNote.reason_code,
            notes: providerCreditNote.notes,
            customer_id: providerCreditNote.customer_id,
            deleted: providerCreditNote.deleted,
            date: providerCreditNote.date,
            updated_at: providerCreditNote.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
