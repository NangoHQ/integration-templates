import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    begin_time: z.string().optional().describe('Start of time range in RFC 3339 format. Inclusive. Default: current time minus one year.'),
    end_time: z.string().optional().describe('End of time range in RFC 3339 format. Default: current time.'),
    sort_order: z.enum(['ASC', 'DESC']).optional().describe('Sort order. Default: DESC.'),
    cursor: z.string().optional().describe('Pagination cursor from a previous response.'),
    location_id: z.string().optional().describe('Limit results to this location.'),
    total: z.number().optional().describe('Exact amount in total_money for a payment.'),
    last_4: z.string().optional().describe('Last four digits of a payment card.'),
    card_brand: z.string().optional().describe('Brand of the payment card (e.g. VISA).'),
    limit: z.number().int().min(1).max(100).optional().describe('Maximum results per page. Default: 100.'),
    is_offline_payment: z.boolean().optional().describe('Whether the payment was taken offline.'),
    offline_begin_time: z.string().optional().describe('Start of offline payment time range in RFC 3339 format.'),
    offline_end_time: z.string().optional().describe('End of offline payment time range in RFC 3339 format.'),
    updated_at_begin_time: z.string().optional().describe('Start of updated_at time range in RFC 3339 format.'),
    updated_at_end_time: z.string().optional().describe('End of updated_at time range in RFC 3339 format.'),
    sort_field: z.enum(['CREATED_AT', 'UPDATED_AT']).optional().describe('Field to sort by. Default: CREATED_AT.')
});

const MoneySchema = z.object({
    amount: z.number().optional(),
    currency: z.string().optional()
});

const ProcessingFeeSchema = z.object({
    effective_at: z.string().optional(),
    type: z.string().optional(),
    amount_money: MoneySchema.optional()
});

const CardSchema = z.object({
    card_brand: z.string().optional(),
    last_4: z.string().optional(),
    exp_month: z.number().optional(),
    exp_year: z.number().optional(),
    fingerprint: z.string().optional(),
    card_type: z.string().optional(),
    prepaid_type: z.string().optional(),
    bin: z.string().optional()
});

const CardDetailsSchema = z.object({
    status: z.string().optional(),
    card: CardSchema.optional(),
    entry_method: z.string().optional(),
    cvv_status: z.string().optional(),
    avs_status: z.string().optional(),
    auth_result_code: z.string().optional(),
    statement_description: z.string().optional(),
    card_payment_timeline: z
        .object({
            authorized_at: z.string().optional(),
            captured_at: z.string().optional()
        })
        .optional()
});

const ApplicationDetailsSchema = z.object({
    square_product: z.string().optional(),
    application_id: z.string().optional()
});

const PaymentSchema = z
    .object({
        id: z.string(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        amount_money: MoneySchema.optional(),
        status: z.string().optional(),
        delay_duration: z.string().optional(),
        source_type: z.string().optional(),
        card_details: CardDetailsSchema.optional(),
        location_id: z.string().optional(),
        order_id: z.string().optional(),
        processing_fee: z.array(ProcessingFeeSchema).optional(),
        note: z.string().optional(),
        total_money: MoneySchema.optional(),
        approved_money: MoneySchema.optional(),
        employee_id: z.string().optional(),
        receipt_number: z.string().optional(),
        receipt_url: z.string().optional(),
        delay_action: z.string().optional(),
        delayed_until: z.string().optional(),
        team_member_id: z.string().optional(),
        application_details: ApplicationDetailsSchema.optional(),
        version_token: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    payments: z.array(PaymentSchema).optional(),
    cursor: z.string().optional(),
    errors: z.array(z.object({}).passthrough()).optional()
});

const OutputSchema = z.object({
    payments: z.array(PaymentSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List payments.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['PAYMENTS_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.squareup.com/reference/square/payments-api/list-payments
            endpoint: '/v2/payments',
            params: {
                ...(input.begin_time !== undefined && { begin_time: input.begin_time }),
                ...(input.end_time !== undefined && { end_time: input.end_time }),
                ...(input.sort_order !== undefined && { sort_order: input.sort_order }),
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.location_id !== undefined && { location_id: input.location_id }),
                ...(input.total !== undefined && { total: String(input.total) }),
                ...(input.last_4 !== undefined && { last_4: input.last_4 }),
                ...(input.card_brand !== undefined && { card_brand: input.card_brand }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.is_offline_payment !== undefined && { is_offline_payment: String(input.is_offline_payment) }),
                ...(input.offline_begin_time !== undefined && { offline_begin_time: input.offline_begin_time }),
                ...(input.offline_end_time !== undefined && { offline_end_time: input.offline_end_time }),
                ...(input.updated_at_begin_time !== undefined && { updated_at_begin_time: input.updated_at_begin_time }),
                ...(input.updated_at_end_time !== undefined && { updated_at_end_time: input.updated_at_end_time }),
                ...(input.sort_field !== undefined && { sort_field: input.sort_field })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Square API returned errors',
                errors: parsed.errors
            });
        }

        return {
            payments: parsed.payments || [],
            ...(parsed.cursor != null && { next_cursor: parsed.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
