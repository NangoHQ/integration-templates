import { z } from 'zod';
import { createAction } from 'nango';
import { randomUUID } from 'crypto';

const MoneySchema = z.object({
    value: z.string().describe('The monetary value. Example: "10.00"'),
    currency_code: z
        .string()
        .regex(/^[A-Z]{3}$/, 'currency_code must be three uppercase letters.')
        .describe('The three-character ISO-4217 currency code. Example: "USD"')
});

const PricingTierSchema = z.object({
    starting_quantity: z.string().describe('The starting quantity for the tier. Example: "1"'),
    ending_quantity: z.string().optional().describe('The ending quantity for the tier. Optional for the last tier. Example: "1000"'),
    amount: MoneySchema.describe('The pricing amount for the tier.')
});

const PricingSchemeSchema = z.object({
    fixed_price: MoneySchema.optional().describe('The fixed amount to charge for the subscription.'),
    pricing_model: z.enum(['VOLUME', 'TIERED']).optional().describe('The pricing model for tiered plans. Required when tiers are specified.'),
    tiers: z.array(PricingTierSchema).optional().describe('An array of pricing tiers. Required when pricing_model is specified.')
});

const UpdatePricingSchemeRequestSchema = z.object({
    billing_cycle_sequence: z.number().int().min(1).max(99).describe('The billing cycle sequence to update. Example: 1'),
    pricing_scheme: PricingSchemeSchema.describe('The updated pricing scheme for this billing cycle.')
});

const InputSchema = z.object({
    plan_id: z.string().describe('The PayPal plan ID. Example: "P-3F897353EP795272HNJKULHQ"'),
    pricing_schemes: z.array(UpdatePricingSchemeRequestSchema).min(1).max(99).describe('One or more billing cycle pricing scheme updates.'),
    request_id: z
        .string()
        .regex(/^[\x21-\x7E]{1,38}$/, 'request_id must be 1-38 printable ASCII characters (PayPal-Request-Id limit).')
        .optional()
        .describe('Optional idempotency key sent as PayPal-Request-Id. If omitted, a random one is generated per execution.')
});

const OutputSchema = z.object({
    plan_id: z.string().describe('The PayPal plan ID that was updated.')
});

const action = createAction({
    description: 'Update the pricing scheme of one or more billing cycles on a plan.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/subscriptions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.paypal.com/docs/api/subscriptions/v1/#plans_update-pricing-schemes
        await nango.post({
            endpoint: `/v1/billing/plans/${encodeURIComponent(input.plan_id)}/update-pricing-schemes`,
            data: {
                pricing_schemes: input.pricing_schemes.map((scheme) => ({
                    billing_cycle_sequence: scheme.billing_cycle_sequence,
                    pricing_scheme: {
                        ...(scheme.pricing_scheme.fixed_price !== undefined && {
                            fixed_price: scheme.pricing_scheme.fixed_price
                        }),
                        ...(scheme.pricing_scheme.pricing_model !== undefined && {
                            pricing_model: scheme.pricing_scheme.pricing_model
                        }),
                        ...(scheme.pricing_scheme.tiers !== undefined && {
                            tiers: scheme.pricing_scheme.tiers.map((tier) => ({
                                starting_quantity: tier.starting_quantity,
                                ...(tier.ending_quantity !== undefined && {
                                    ending_quantity: tier.ending_quantity
                                }),
                                amount: tier.amount
                            }))
                        })
                    }
                }))
            },
            headers: {
                // One idempotency key per execution so retries resolve to the same pricing update.
                'PayPal-Request-Id': input.request_id ?? randomUUID()
            },
            retries: 3
        });

        return {
            plan_id: input.plan_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
