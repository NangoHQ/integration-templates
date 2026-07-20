import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    plan_id: z.string().describe('The PayPal billing plan ID. Example: "P-3F897353EP795272HNJKULHQ"')
});

const ProviderBillingCycleSchema = z.object({
    pricing_scheme: z.record(z.string(), z.unknown()).optional(),
    frequency: z.record(z.string(), z.unknown()).optional(),
    tenure_type: z.string().optional(),
    sequence: z.number().optional(),
    total_cycles: z.number().optional()
});

const ProviderPaymentPreferencesSchema = z.object({
    auto_bill_outstanding: z.boolean().optional(),
    setup_fee: z.record(z.string(), z.unknown()).optional(),
    setup_fee_failure_action: z.string().optional(),
    payment_failure_threshold: z.number().optional()
});

const ProviderTaxesSchema = z.object({
    percentage: z.string().optional(),
    inclusive: z.boolean().optional()
});

const ProviderLinkSchema = z.object({
    href: z.string(),
    rel: z.string(),
    method: z.string().optional()
});

const ProviderPlanSchema = z.object({
    id: z.string(),
    product_id: z.string().optional(),
    name: z.string().optional(),
    status: z.string().optional(),
    description: z.string().optional(),
    usage_type: z.string().optional(),
    billing_cycles: z.array(ProviderBillingCycleSchema).optional(),
    payment_preferences: ProviderPaymentPreferencesSchema.optional(),
    taxes: ProviderTaxesSchema.optional(),
    quantity_supported: z.boolean().optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    links: z.array(ProviderLinkSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    product_id: z.string().optional(),
    name: z.string().optional(),
    status: z.string().optional(),
    description: z.string().optional(),
    usage_type: z.string().optional(),
    billing_cycles: z.array(ProviderBillingCycleSchema).optional(),
    payment_preferences: ProviderPaymentPreferencesSchema.optional(),
    taxes: ProviderTaxesSchema.optional(),
    quantity_supported: z.boolean().optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a billing plan.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/subscriptions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch We catch 404s from PayPal and convert them to a typed ActionError so callers get a clean not_found response instead of a raw HTTP exception.
        try {
            response = await nango.get({
                // https://developer.paypal.com/api/rest/
                endpoint: `/v1/billing/plans/${encodeURIComponent(input.plan_id)}`,
                retries: 3
            });
        } catch (err: unknown) {
            const status =
                err !== null &&
                typeof err === 'object' &&
                'response' in err &&
                err.response !== null &&
                typeof err.response === 'object' &&
                'status' in err.response &&
                typeof err.response.status === 'number'
                    ? err.response.status
                    : undefined;

            if (status === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Plan not found.',
                    plan_id: input.plan_id
                });
            }

            throw err;
        }

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Plan not found or invalid response received.',
                plan_id: input.plan_id
            });
        }

        const plan = ProviderPlanSchema.parse(response.data);

        return {
            id: plan.id,
            ...(plan.product_id !== undefined && { product_id: plan.product_id }),
            ...(plan.name !== undefined && { name: plan.name }),
            ...(plan.status !== undefined && { status: plan.status }),
            ...(plan.description !== undefined && { description: plan.description }),
            ...(plan.usage_type !== undefined && { usage_type: plan.usage_type }),
            ...(plan.billing_cycles !== undefined && { billing_cycles: plan.billing_cycles }),
            ...(plan.payment_preferences !== undefined && { payment_preferences: plan.payment_preferences }),
            ...(plan.taxes !== undefined && { taxes: plan.taxes }),
            ...(plan.quantity_supported !== undefined && { quantity_supported: plan.quantity_supported }),
            ...(plan.create_time !== undefined && { create_time: plan.create_time }),
            ...(plan.update_time !== undefined && { update_time: plan.update_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
