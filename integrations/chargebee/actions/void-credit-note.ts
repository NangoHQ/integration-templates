import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    credit_note_id: z.string().describe('Credit note ID. Example: "cbnote_123"')
});

const CreditNoteSchema = z
    .object({
        id: z.string(),
        customer_id: z.string(),
        subscription_id: z.string().nullable().optional(),
        reference_invoice_id: z.string().nullable().optional(),
        type: z.enum(['adjustment', 'refundable', 'store']),
        reason_code: z.string().optional(),
        status: z.enum(['adjusted', 'refunded', 'refund_due', 'voided']),
        vat_number: z.string().optional(),
        date: z.number().optional(),
        price_type: z.enum(['tax_exclusive', 'tax_inclusive']),
        currency_code: z.string(),
        total: z.number().optional(),
        amount_allocated: z.number().optional(),
        amount_refunded: z.number().optional(),
        amount_available: z.number().optional(),
        refunded_at: z.number().optional(),
        voided_at: z.number().optional(),
        generated_at: z.number().optional(),
        resource_version: z.number().optional(),
        updated_at: z.number().optional(),
        channel: z.enum(['web', 'app_store', 'play_store']).optional(),
        sub_total: z.number(),
        sub_total_in_local_currency: z.number().optional(),
        total_in_local_currency: z.number().optional(),
        local_currency_code: z.string().optional(),
        round_off_amount: z.number().optional(),
        fractional_correction: z.number().optional(),
        notes: z.array(z.string()).optional(),
        deleted: z.boolean(),
        tax_category: z.string().optional(),
        local_currency_exchange_rate: z.number().optional(),
        create_reason_code: z.string().optional(),
        vat_number_prefix: z.string().optional(),
        business_entity_id: z.string().optional()
    })
    .passthrough();

const OutputSchema = CreditNoteSchema;

const action = createAction({
    description: 'Void a credit note.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://apidocs.chargebee.com/docs/api/credit_notes#void_a_credit_note
            endpoint: `/api/v2/credit_notes/${encodeURIComponent(input.credit_note_id)}/void`,
            retries: 10
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object' || !('credit_note' in raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Chargebee API.'
            });
        }

        const creditNote = CreditNoteSchema.parse(raw.credit_note);

        return creditNote;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
