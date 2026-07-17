import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    payment_id: z.string().describe('A unique ID for the desired payment. Example: "f3YEx4hWP1mDncRMtBjc4TM4OKNZY"')
});

const MoneySchema = z
    .object({
        amount: z.number(),
        currency: z.string()
    })
    .optional();

const CardSchema = z
    .object({
        card_brand: z.string().optional(),
        last_4: z.string().optional(),
        exp_month: z.number().optional(),
        exp_year: z.number().optional(),
        fingerprint: z.string().optional(),
        card_type: z.string().optional(),
        prepaid_type: z.string().optional(),
        bin: z.string().optional()
    })
    .optional();

const CardDetailsSchema = z
    .object({
        status: z.string().optional(),
        card: CardSchema,
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
    })
    .optional();

const ProcessingFeeSchema = z
    .object({
        effective_at: z.string().optional(),
        type: z.string().optional(),
        amount_money: MoneySchema
    })
    .optional();

const ApplicationDetailsSchema = z
    .object({
        square_product: z.string().optional(),
        application_id: z.string().optional()
    })
    .optional();

const ProviderPaymentSchema = z.object({
    id: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    amount_money: MoneySchema,
    status: z.string().optional(),
    delay_duration: z.string().optional(),
    source_type: z.string().optional(),
    card_details: CardDetailsSchema,
    location_id: z.string().optional(),
    order_id: z.string().optional(),
    processing_fee: z.array(ProcessingFeeSchema).optional(),
    note: z.string().optional(),
    total_money: MoneySchema,
    approved_money: MoneySchema,
    employee_id: z.string().optional(),
    receipt_number: z.string().optional(),
    receipt_url: z.string().optional(),
    delay_action: z.string().optional(),
    delayed_until: z.string().optional(),
    team_member_id: z.string().optional(),
    application_details: ApplicationDetailsSchema,
    version_token: z.string().optional()
});

const ProviderResponseSchema = z.object({
    payment: ProviderPaymentSchema.optional(),
    errors: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    amount_money: MoneySchema,
    status: z.string().optional(),
    source_type: z.string().optional(),
    card_details: CardDetailsSchema,
    location_id: z.string().optional(),
    order_id: z.string().optional(),
    processing_fee: z.array(ProcessingFeeSchema).optional(),
    note: z.string().optional(),
    total_money: MoneySchema,
    approved_money: MoneySchema,
    receipt_number: z.string().optional(),
    receipt_url: z.string().optional(),
    delay_action: z.string().optional(),
    delayed_until: z.string().optional(),
    team_member_id: z.string().optional(),
    application_details: ApplicationDetailsSchema,
    version_token: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a payment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['PAYMENTS_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.squareup.com/reference/square/payments-api/get-payment
            endpoint: `/v2/payments/${encodeURIComponent(input.payment_id)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Square API returned errors',
                errors: providerResponse.errors
            });
        }

        if (!providerResponse.payment) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Payment not found',
                payment_id: input.payment_id
            });
        }

        const payment = providerResponse.payment;

        return {
            id: payment.id,
            ...(payment.created_at !== undefined && { created_at: payment.created_at }),
            ...(payment.updated_at !== undefined && { updated_at: payment.updated_at }),
            amount_money: payment.amount_money,
            ...(payment.status !== undefined && { status: payment.status }),
            ...(payment.source_type !== undefined && { source_type: payment.source_type }),
            card_details: payment.card_details,
            ...(payment.location_id !== undefined && { location_id: payment.location_id }),
            ...(payment.order_id !== undefined && { order_id: payment.order_id }),
            ...(payment.processing_fee !== undefined && { processing_fee: payment.processing_fee }),
            ...(payment.note !== undefined && { note: payment.note }),
            total_money: payment.total_money,
            approved_money: payment.approved_money,
            ...(payment.receipt_number !== undefined && { receipt_number: payment.receipt_number }),
            ...(payment.receipt_url !== undefined && { receipt_url: payment.receipt_url }),
            ...(payment.delay_action !== undefined && { delay_action: payment.delay_action }),
            ...(payment.delayed_until !== undefined && { delayed_until: payment.delayed_until }),
            ...(payment.team_member_id !== undefined && { team_member_id: payment.team_member_id }),
            application_details: payment.application_details,
            ...(payment.version_token !== undefined && { version_token: payment.version_token })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
