import { z } from 'zod';
import { createAction } from 'nango';
import { randomUUID } from 'crypto';

const MoneySchema = z.object({
    currency_code: z
        .string()
        .regex(/^[A-Z]{3}$/, 'currency_code must be a three-letter uppercase ISO-4217 code.')
        .describe('The three-character ISO-4217 currency code. Example: "USD"'),
    value: z.string().describe('The amount value. Example: "10.00"')
});

const FrequencySchema = z.object({
    interval_unit: z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR']).describe('The interval at which the subscription is billed.'),
    interval_count: z.number().int().min(1).max(365).default(1).describe('The number of intervals after which a subscriber is billed.')
});

const PricingSchemeSchema = z.object({
    fixed_price: MoneySchema.optional().describe('The fixed amount to charge for the subscription.'),
    pricing_model: z.enum(['VOLUME', 'TIERED']).optional().describe('The pricing model for tiered plans.'),
    tiers: z
        .array(
            z.object({
                starting_quantity: z.string().describe('The starting quantity for the tier.'),
                ending_quantity: z.string().optional().describe('The ending quantity for the tier.'),
                amount: MoneySchema.describe('The pricing amount for the tier.')
            })
        )
        .optional()
        .describe('An array of pricing tiers for volume/tiered plans.')
});

const BillingCycleSchema = z
    .object({
        frequency: FrequencySchema.describe('The frequency details for this billing cycle.'),
        tenure_type: z.enum(['REGULAR', 'TRIAL']).describe('The tenure type of the billing cycle.'),
        sequence: z.number().int().min(1).max(99).describe('The order in which this cycle runs among other billing cycles.'),
        total_cycles: z
            .number()
            .int()
            .min(0)
            .max(999)
            .optional()
            .describe('The number of times this billing cycle gets executed. 0 means infinite (REGULAR cycles only).'),
        pricing_scheme: PricingSchemeSchema.optional().describe('The active pricing scheme for this billing cycle. Required for REGULAR cycles.')
    })
    .superRefine((cycle, ctx) => {
        if (cycle.tenure_type === 'REGULAR' && cycle.pricing_scheme === undefined) {
            ctx.addIssue({
                code: 'custom',
                path: ['pricing_scheme'],
                message: 'pricing_scheme is required for REGULAR billing cycles.'
            });
        }
        if (cycle.tenure_type === 'TRIAL' && cycle.total_cycles !== undefined && cycle.total_cycles < 1) {
            ctx.addIssue({
                code: 'custom',
                path: ['total_cycles'],
                message: 'TRIAL billing cycles must run a finite number of times (total_cycles >= 1); 0 (infinite) is only valid for REGULAR cycles.'
            });
        }
    });

const PaymentPreferencesSchema = z.object({
    auto_bill_outstanding: z.boolean().optional().describe('Whether to automatically bill the outstanding amount in the next billing cycle.'),
    setup_fee: MoneySchema.optional().describe('The initial set-up fee for the service.'),
    setup_fee_failure_action: z.enum(['CONTINUE', 'CANCEL']).optional().describe('The action if the initial setup fee payment fails.'),
    payment_failure_threshold: z.number().int().min(0).max(999).optional().describe('The maximum number of payment failures before suspension.')
});

const TaxesSchema = z.object({
    percentage: z.string().describe('The tax percentage on the billing amount.'),
    inclusive: z.boolean().optional().describe('Whether the tax was already included in the billing amount.')
});

const InputSchema = z
    .object({
        product_id: z.string().min(6).max(50).describe('The ID for the product. Example: "PROD-XXCD1234QWER65782"'),
        name: z.string().min(1).max(127).describe('The plan name.'),
        description: z.string().min(1).max(127).optional().describe('The detailed description of the plan.'),
        status: z.enum(['ACTIVE', 'INACTIVE', 'CREATED']).optional().describe('The initial status of the plan.'),
        billing_cycles: z
            .array(BillingCycleSchema)
            .min(1)
            .max(12)
            .describe('An array of billing cycles for trial and regular billing. Exactly one REGULAR cycle and at most two TRIAL cycles.'),
        payment_preferences: PaymentPreferencesSchema.optional().describe('The payment preferences for subscriptions.'),
        taxes: TaxesSchema.optional().describe('The tax details.'),
        quantity_supported: z.boolean().optional().describe('Whether you can subscribe by providing a quantity.'),
        request_id: z.string().optional().describe('Optional idempotency key sent as PayPal-Request-Id. If omitted, a random one is generated per execution.')
    })
    .superRefine((value, ctx) => {
        const regularCount = value.billing_cycles.filter((cycle) => cycle.tenure_type === 'REGULAR').length;
        const trialCount = value.billing_cycles.filter((cycle) => cycle.tenure_type === 'TRIAL').length;

        if (regularCount !== 1) {
            ctx.addIssue({
                code: 'custom',
                path: ['billing_cycles'],
                message: `A plan must have exactly one REGULAR billing cycle (found ${regularCount}).`
            });
        }
        if (trialCount > 2) {
            ctx.addIssue({
                code: 'custom',
                path: ['billing_cycles'],
                message: `A plan may have at most two TRIAL billing cycles (found ${trialCount}).`
            });
        }
    });

const LinkSchema = z.object({
    href: z.string(),
    rel: z.string(),
    method: z.string().optional()
});

const ProviderPlanSchema = z.object({
    id: z.string(),
    product_id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    status: z.enum(['CREATED', 'INACTIVE', 'ACTIVE']).optional(),
    billing_cycles: z.array(
        z.object({
            frequency: z.object({
                interval_unit: z.string(),
                interval_count: z.number()
            }),
            tenure_type: z.string(),
            sequence: z.number(),
            total_cycles: z.number().optional(),
            pricing_scheme: z
                .object({
                    fixed_price: z
                        .object({
                            currency_code: z.string(),
                            value: z.string()
                        })
                        .optional(),
                    pricing_model: z.string().optional(),
                    tiers: z
                        .array(
                            z.object({
                                starting_quantity: z.string(),
                                ending_quantity: z.string().optional(),
                                amount: z.object({
                                    currency_code: z.string(),
                                    value: z.string()
                                })
                            })
                        )
                        .optional(),
                    version: z.number().optional(),
                    create_time: z.string().optional(),
                    update_time: z.string().optional()
                })
                .optional()
        })
    ),
    payment_preferences: z
        .object({
            auto_bill_outstanding: z.boolean().optional(),
            setup_fee: z
                .object({
                    currency_code: z.string(),
                    value: z.string()
                })
                .optional(),
            setup_fee_failure_action: z.string().optional(),
            payment_failure_threshold: z.number().optional()
        })
        .optional(),
    taxes: z
        .object({
            percentage: z.string().optional(),
            inclusive: z.boolean().optional()
        })
        .optional(),
    quantity_supported: z.boolean().optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    links: z.array(LinkSchema).optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The unique PayPal-generated ID for the plan.'),
    product_id: z.string().describe('The ID for the product.'),
    name: z.string().describe('The plan name.'),
    description: z.string().optional().describe('The detailed description of the plan.'),
    status: z.enum(['CREATED', 'INACTIVE', 'ACTIVE']).optional().describe('The plan status.'),
    billing_cycles: z.array(
        z.object({
            frequency: z.object({
                interval_unit: z.string().describe('The interval unit.'),
                interval_count: z.number().describe('The interval count.')
            }),
            tenure_type: z.string().describe('The tenure type of the billing cycle.'),
            sequence: z.number().describe('The order in which this cycle runs.'),
            total_cycles: z.number().optional().describe('The number of times this cycle gets executed.'),
            pricing_scheme: z
                .object({
                    fixed_price: z
                        .object({
                            currency_code: z.string().describe('The currency code.'),
                            value: z.string().describe('The amount value.')
                        })
                        .optional(),
                    pricing_model: z.string().optional(),
                    tiers: z
                        .array(
                            z.object({
                                starting_quantity: z.string(),
                                ending_quantity: z.string().optional(),
                                amount: z.object({
                                    currency_code: z.string(),
                                    value: z.string()
                                })
                            })
                        )
                        .optional()
                        .describe('The pricing tiers for volume/tiered plans.'),
                    version: z.number().optional(),
                    create_time: z.string().optional(),
                    update_time: z.string().optional()
                })
                .optional()
        })
    ),
    payment_preferences: z
        .object({
            auto_bill_outstanding: z.boolean().optional(),
            setup_fee: z
                .object({
                    currency_code: z.string(),
                    value: z.string()
                })
                .optional(),
            setup_fee_failure_action: z.string().optional(),
            payment_failure_threshold: z.number().optional()
        })
        .optional(),
    taxes: z
        .object({
            percentage: z.string().optional(),
            inclusive: z.boolean().optional()
        })
        .optional(),
    quantity_supported: z.boolean().optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    links: z.array(LinkSchema).optional()
});

const action = createAction({
    description: 'Create a billing plan.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/subscriptions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.paypal.com/docs/api/subscriptions/v1/#plans_create
            endpoint: '/v1/billing/plans',
            headers: {
                Prefer: 'return=representation',
                // One idempotency key per execution so all internal retries resolve to the same plan.
                'PayPal-Request-Id': input.request_id ?? randomUUID()
            },
            data: {
                product_id: input.product_id,
                name: input.name,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.status !== undefined && { status: input.status }),
                billing_cycles: input.billing_cycles.map((cycle) => ({
                    frequency: cycle.frequency,
                    tenure_type: cycle.tenure_type,
                    sequence: cycle.sequence,
                    ...(cycle.total_cycles !== undefined && { total_cycles: cycle.total_cycles }),
                    ...(cycle.pricing_scheme !== undefined && {
                        pricing_scheme: {
                            ...(cycle.pricing_scheme.fixed_price !== undefined && {
                                fixed_price: cycle.pricing_scheme.fixed_price
                            }),
                            ...(cycle.pricing_scheme.pricing_model !== undefined && {
                                pricing_model: cycle.pricing_scheme.pricing_model
                            }),
                            ...(cycle.pricing_scheme.tiers !== undefined && {
                                tiers: cycle.pricing_scheme.tiers.map((tier) => ({
                                    starting_quantity: tier.starting_quantity,
                                    ...(tier.ending_quantity !== undefined && { ending_quantity: tier.ending_quantity }),
                                    amount: tier.amount
                                }))
                            })
                        }
                    })
                })),
                ...(input.payment_preferences !== undefined && {
                    payment_preferences: {
                        ...(input.payment_preferences.auto_bill_outstanding !== undefined && {
                            auto_bill_outstanding: input.payment_preferences.auto_bill_outstanding
                        }),
                        ...(input.payment_preferences.setup_fee !== undefined && {
                            setup_fee: input.payment_preferences.setup_fee
                        }),
                        ...(input.payment_preferences.setup_fee_failure_action !== undefined && {
                            setup_fee_failure_action: input.payment_preferences.setup_fee_failure_action
                        }),
                        ...(input.payment_preferences.payment_failure_threshold !== undefined && {
                            payment_failure_threshold: input.payment_preferences.payment_failure_threshold
                        })
                    }
                }),
                ...(input.taxes !== undefined && {
                    taxes: {
                        percentage: input.taxes.percentage,
                        ...(input.taxes.inclusive !== undefined && { inclusive: input.taxes.inclusive })
                    }
                }),
                ...(input.quantity_supported !== undefined && { quantity_supported: input.quantity_supported })
            },
            retries: 10
        });

        const providerPlan = ProviderPlanSchema.parse(response.data);

        return {
            id: providerPlan.id,
            product_id: providerPlan.product_id,
            name: providerPlan.name,
            description: providerPlan.description,
            status: providerPlan.status,
            billing_cycles: providerPlan.billing_cycles.map((cycle) => ({
                frequency: cycle.frequency,
                tenure_type: cycle.tenure_type,
                sequence: cycle.sequence,
                total_cycles: cycle.total_cycles,
                pricing_scheme: cycle.pricing_scheme
                    ? {
                          fixed_price: cycle.pricing_scheme.fixed_price,
                          pricing_model: cycle.pricing_scheme.pricing_model,
                          tiers: cycle.pricing_scheme.tiers,
                          version: cycle.pricing_scheme.version,
                          create_time: cycle.pricing_scheme.create_time,
                          update_time: cycle.pricing_scheme.update_time
                      }
                    : undefined
            })),
            payment_preferences: providerPlan.payment_preferences
                ? {
                      auto_bill_outstanding: providerPlan.payment_preferences.auto_bill_outstanding,
                      setup_fee: providerPlan.payment_preferences.setup_fee,
                      setup_fee_failure_action: providerPlan.payment_preferences.setup_fee_failure_action,
                      payment_failure_threshold: providerPlan.payment_preferences.payment_failure_threshold
                  }
                : undefined,
            taxes: providerPlan.taxes
                ? {
                      percentage: providerPlan.taxes.percentage,
                      inclusive: providerPlan.taxes.inclusive
                  }
                : undefined,
            quantity_supported: providerPlan.quantity_supported,
            create_time: providerPlan.create_time,
            update_time: providerPlan.update_time,
            links: providerPlan.links
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
