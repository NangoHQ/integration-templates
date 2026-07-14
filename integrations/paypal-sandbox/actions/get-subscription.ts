import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the subscription. Example: "I-J865PV7D94N2"')
});

const MoneySchema = z.object({
    currency_code: z.string(),
    value: z.string()
});

const NameSchema = z.object({
    given_name: z.string().optional(),
    surname: z.string().optional()
});

const AddressSchema = z.object({
    address_line_1: z.string().optional(),
    address_line_2: z.string().optional(),
    admin_area_2: z.string().optional(),
    admin_area_1: z.string().optional(),
    postal_code: z.string().optional(),
    country_code: z.string().optional()
});

const ShippingAddressSchema = z.object({
    name: z
        .object({
            full_name: z.string().optional()
        })
        .optional(),
    address: AddressSchema.optional()
});

const SubscriberSchema = z.object({
    name: NameSchema.optional(),
    email_address: z.string().optional(),
    payer_id: z.string().optional(),
    shipping_address: ShippingAddressSchema.optional()
});

const LastPaymentSchema = z.object({
    status: z.string().optional(),
    amount: MoneySchema.optional(),
    time: z.string().optional()
});

const BillingInfoSchema = z.object({
    outstanding_balance: MoneySchema.optional(),
    cycle_executions: z
        .array(
            z.object({
                tenure_type: z.string().optional(),
                sequence: z.number().optional(),
                cycles_completed: z.number().optional(),
                cycles_remaining: z.number().optional(),
                current_pricing_scheme_version: z.number().optional()
            })
        )
        .optional(),
    last_payment: LastPaymentSchema.optional(),
    next_billing_time: z.string().optional(),
    failed_payments_count: z.number().optional(),
    payment_source: z
        .object({
            card: z
                .object({
                    last_digits: z.string().optional(),
                    brand: z.string().optional(),
                    type: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const LinkSchema = z.object({
    href: z.string(),
    rel: z.string(),
    method: z.string().optional()
});

const ProviderSubscriptionSchema = z.object({
    id: z.string(),
    status: z.string(),
    status_update_time: z.string().optional(),
    plan_id: z.string(),
    plan_overridden: z.boolean().optional(),
    start_time: z.string().optional(),
    quantity: z.string().optional(),
    shipping_amount: MoneySchema.optional(),
    subscriber: SubscriberSchema.optional(),
    billing_info: BillingInfoSchema.optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    custom_id: z.string().optional(),
    links: z.array(LinkSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    status_update_time: z.string().optional(),
    plan_id: z.string(),
    plan_overridden: z.boolean().optional(),
    start_time: z.string().optional(),
    quantity: z.string().optional(),
    shipping_amount: MoneySchema.optional(),
    subscriber: SubscriberSchema.optional(),
    billing_info: BillingInfoSchema.optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    custom_id: z.string().optional(),
    links: z.array(LinkSchema).optional()
});

const action = createAction({
    description: 'Retrieve a subscription.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/subscriptions/read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch We catch 404s from PayPal and convert them to a typed ActionError so callers get a clean not_found response instead of a raw HTTP exception.
        try {
            response = await nango.get({
                // https://developer.paypal.com/api/subscriptions/v1/#subscriptions_get
                endpoint: `/v1/billing/subscriptions/${encodeURIComponent(input.id)}`,
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
                    message: 'Subscription not found.',
                    id: input.id
                });
            }

            throw err;
        }

        const subscription = ProviderSubscriptionSchema.parse(response.data);

        return {
            id: subscription.id,
            status: subscription.status,
            ...(subscription.status_update_time !== undefined && { status_update_time: subscription.status_update_time }),
            plan_id: subscription.plan_id,
            ...(subscription.plan_overridden !== undefined && { plan_overridden: subscription.plan_overridden }),
            ...(subscription.start_time !== undefined && { start_time: subscription.start_time }),
            ...(subscription.quantity !== undefined && { quantity: subscription.quantity }),
            ...(subscription.shipping_amount !== undefined && { shipping_amount: subscription.shipping_amount }),
            ...(subscription.subscriber !== undefined && { subscriber: subscription.subscriber }),
            ...(subscription.billing_info !== undefined && { billing_info: subscription.billing_info }),
            ...(subscription.create_time !== undefined && { create_time: subscription.create_time }),
            ...(subscription.update_time !== undefined && { update_time: subscription.update_time }),
            ...(subscription.custom_id !== undefined && { custom_id: subscription.custom_id }),
            ...(subscription.links !== undefined && { links: subscription.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
