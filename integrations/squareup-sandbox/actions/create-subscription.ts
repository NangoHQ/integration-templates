import { randomUUID } from 'crypto';
import { z } from 'zod';
import { createAction } from 'nango';

const MoneySchema = z.object({
    amount: z.number(),
    currency: z.string()
});

const PhaseInputSchema = z.object({
    ordinal: z.number(),
    order_template_id: z.string().optional(),
    plan_phase_uid: z.string().optional()
});

const InputSchema = z.object({
    location_id: z.string().describe('The ID of the location the subscription is associated with. Example: "S8GWD5R9QB376"'),
    plan_variation_id: z.string().describe('The ID of the subscription plan variation. Example: "6JHXF3B2CW3YKHDV4XEM674H"'),
    customer_id: z.string().describe('The ID of the customer subscribing. Example: "CHFGVKYY8RSV93M5KCYTG4PN0G"'),
    card_id: z.string().describe('The ID of the subscriber\'s card to charge. Example: "ccof:qy5x8hHGYsgLrp4Q4GB"'),
    start_date: z.string().optional().describe('The YYYY-MM-DD-formatted date to start the subscription. Omit for immediate start.'),
    canceled_date: z.string().optional().describe('The YYYY-MM-DD-formatted date when the subscription is scheduled for cancellation.'),
    tax_percentage: z.string().optional().describe('Tax percentage in decimal form. Example: "7.5" for 7.5%.'),
    price_override_money: MoneySchema.optional(),
    timezone: z.string().optional().describe('IANA Timezone Database identifier. Example: "America/Los_Angeles".'),
    monthly_billing_anchor_date: z.number().optional().describe('The day-of-the-month to change the billing date to. Min: 1, Max: 31.'),
    phases: z.array(PhaseInputSchema).optional(),
    idempotency_key: z.string().optional().describe('A unique string that identifies this request.')
});

const SubscriptionSourceSchema = z.object({
    name: z.string().optional()
});

const PhaseSchema = z.object({
    uid: z.string().optional(),
    ordinal: z.number().optional(),
    order_template_id: z.string().optional(),
    plan_phase_uid: z.string().optional()
});

const SubscriptionSchema = z.object({
    id: z.string(),
    location_id: z.string().optional(),
    plan_variation_id: z.string().optional(),
    customer_id: z.string().optional(),
    start_date: z.string().optional(),
    canceled_date: z.string().optional(),
    charged_through_date: z.string().optional(),
    status: z.string().optional(),
    tax_percentage: z.string().optional(),
    invoice_ids: z.array(z.string()).optional(),
    price_override_money: MoneySchema.optional(),
    version: z.number().optional(),
    created_at: z.string().optional(),
    card_id: z.string().optional(),
    timezone: z.string().optional(),
    source: SubscriptionSourceSchema.optional(),
    monthly_billing_anchor_date: z.number().optional(),
    phases: z.array(PhaseSchema).optional(),
    completed_date: z.string().optional()
});

const OutputSchema = z.object({
    subscription: SubscriptionSchema
});

const action = createAction({
    description: 'Create a subscription.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['SUBSCRIPTIONS_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            location_id: input.location_id,
            plan_variation_id: input.plan_variation_id,
            customer_id: input.customer_id,
            card_id: input.card_id
        };

        // Always send an idempotency key so the retry below can never create a duplicate
        // subscription if a transport failure occurs after Square has already processed
        // the request. Use the caller-supplied key when present, otherwise generate one.
        requestBody['idempotency_key'] = input.idempotency_key ?? randomUUID();

        if (input.start_date !== undefined) {
            requestBody['start_date'] = input.start_date;
        }
        if (input.canceled_date !== undefined) {
            requestBody['canceled_date'] = input.canceled_date;
        }
        if (input.tax_percentage !== undefined) {
            requestBody['tax_percentage'] = input.tax_percentage;
        }
        if (input.price_override_money !== undefined) {
            requestBody['price_override_money'] = input.price_override_money;
        }
        if (input.timezone !== undefined) {
            requestBody['timezone'] = input.timezone;
        }
        if (input.monthly_billing_anchor_date !== undefined) {
            requestBody['monthly_billing_anchor_date'] = input.monthly_billing_anchor_date;
        }
        if (input.phases !== undefined) {
            requestBody['phases'] = input.phases;
        }

        // https://developer.squareup.com/reference/square/subscriptions-api/create-subscription
        const response = await nango.post({
            endpoint: '/v2/subscriptions',
            data: requestBody,
            retries: 3
        });

        const providerResponse = z
            .object({
                subscription: SubscriptionSchema.optional(),
                errors: z
                    .array(
                        z.object({
                            category: z.string().optional(),
                            code: z.string().optional(),
                            detail: z.string().optional(),
                            field: z.string().optional()
                        })
                    )
                    .optional()
            })
            .parse(response.data);

        if (providerResponse.errors) {
            const firstError = providerResponse.errors[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: firstError.detail ?? firstError.code ?? 'Unknown provider error',
                    errors: providerResponse.errors
                });
            }
        }

        if (!providerResponse.subscription) {
            throw new nango.ActionError({
                type: 'missing_subscription',
                message: 'Provider response did not contain a subscription.'
            });
        }

        return {
            subscription: providerResponse.subscription
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
