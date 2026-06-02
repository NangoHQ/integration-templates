import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Maps to Stripe starting_after.'),
    limit: z.number().int().min(1).max(100).optional().describe('Limit on the number of objects returned. Default is 10.'),
    customer: z.string().optional().describe('Only return credit notes for the customer specified by this customer ID.'),
    invoice: z.string().optional().describe('Only return credit notes for the invoice specified by this invoice ID.'),
    created_after: z.number().optional().describe('Only return credit notes created after this Unix timestamp (inclusive). Maps to created[gte].'),
    created_before: z.number().optional().describe('Only return credit notes created before this Unix timestamp (inclusive). Maps to created[lte].')
});

const CreditNoteLineItemSchema = z.object({
    id: z.string(),
    object: z.literal('credit_note_line_item'),
    amount: z.number(),
    description: z.string().optional(),
    discount_amount: z.number(),
    discount_amounts: z.array(z.unknown()),
    invoice_line_item: z.string().optional(),
    livemode: z.boolean(),
    quantity: z.number().optional(),
    tax_rates: z.array(z.unknown()),
    taxes: z.array(z.unknown()),
    type: z.string(),
    unit_amount: z.number().optional(),
    unit_amount_decimal: z.string().optional()
});

const CreditNoteLinesSchema = z.object({
    object: z.literal('list'),
    data: z.array(CreditNoteLineItemSchema),
    has_more: z.boolean(),
    url: z.string()
});

const CreditNoteSchema = z.object({
    id: z.string(),
    object: z.literal('credit_note'),
    amount: z.number(),
    amount_shipping: z.number().optional(),
    created: z.number(),
    currency: z.string(),
    customer: z.string().optional(),
    customer_balance_transaction: z.string().nullable().optional(),
    discount_amount: z.number(),
    discount_amounts: z.array(z.unknown()),
    invoice: z.string().optional(),
    lines: CreditNoteLinesSchema,
    livemode: z.boolean(),
    memo: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    number: z.string().optional(),
    out_of_band_amount: z.number().nullable().optional(),
    pdf: z.string().optional(),
    pre_payment_amount: z.number(),
    post_payment_amount: z.number(),
    reason: z.string().nullable().optional(),
    refunds: z.array(z.unknown()),
    shipping_cost: z.unknown().nullable().optional(),
    status: z.string(),
    subtotal: z.number(),
    subtotal_excluding_tax: z.number(),
    total: z.number(),
    total_excluding_tax: z.number(),
    total_taxes: z.array(z.unknown()),
    type: z.string(),
    voided_at: z.number().nullable().optional()
});

const ListOutputSchema = z.object({
    items: z.array(CreditNoteSchema),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List credit notes from Stripe.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-credit-notes',
        group: 'Credit Notes'
    },
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        // https://docs.stripe.com/api/credit_notes/list
        const response = await nango.get({
            endpoint: '/v1/credit_notes',
            params: {
                ...(input.cursor !== undefined && { starting_after: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.customer !== undefined && { customer: input.customer }),
                ...(input.invoice !== undefined && { invoice: input.invoice }),
                ...(input.created_after !== undefined && { 'created[gte]': String(input.created_after) }),
                ...(input.created_before !== undefined && { 'created[lte]': String(input.created_before) })
            },
            retries: 3
        });

        const listResponse = z
            .object({
                object: z.literal('list'),
                url: z.string(),
                has_more: z.boolean(),
                data: z.array(z.unknown())
            })
            .parse(response.data);

        const items = listResponse.data.map((item: unknown) => CreditNoteSchema.parse(item));
        const lastItem = items[items.length - 1];
        const nextCursor = listResponse.has_more && lastItem !== undefined ? lastItem.id : undefined;

        return {
            items,
            has_more: listResponse.has_more,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
