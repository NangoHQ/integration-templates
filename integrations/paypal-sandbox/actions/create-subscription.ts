import { z } from 'zod';
import { createAction } from 'nango';
import { randomUUID } from 'crypto';

const MoneySchema = z.object({
    currency_code: z.string().regex(/^[A-Z]{3}$/, 'currency_code must be three uppercase letters.'),
    value: z.string()
});

const SubscriberNameSchema = z.object({
    given_name: z.string().optional(),
    surname: z.string().optional()
});

const SubscriberAddressNameSchema = z.object({
    full_name: z.string().optional()
});

const SubscriberAddressSchema = z.object({
    address_line_1: z.string().optional(),
    address_line_2: z.string().optional(),
    admin_area_2: z.string().optional(),
    admin_area_1: z.string().optional(),
    postal_code: z.string().optional(),
    country_code: z.string().optional()
});

const SubscriberSchema = z.object({
    name: SubscriberNameSchema.optional(),
    email_address: z.string().optional(),
    shipping_address: z
        .object({
            name: SubscriberAddressNameSchema.optional(),
            address: SubscriberAddressSchema.optional()
        })
        .optional()
});

const ApplicationContextSchema = z.object({
    brand_name: z.string().optional(),
    locale: z.string().optional(),
    shipping_preference: z.string().optional(),
    user_action: z.string().optional(),
    payment_method: z.object({}).passthrough().optional(),
    return_url: z.string().optional(),
    cancel_url: z.string().optional()
});

const InputSchema = z.object({
    plan_id: z.string().describe('The ID of the plan. Example: "P-5ML4271244454362WXNWU5NQ"'),
    quantity: z.string().optional().describe('The quantity of the product in the subscription.'),
    custom_id: z.string().optional().describe('The custom id for the subscription.'),
    start_time: z.string().optional().describe('The date and time when the subscription started, in Internet date and time format.'),
    shipping_amount: MoneySchema.optional(),
    subscriber: SubscriberSchema.optional(),
    application_context: ApplicationContextSchema.optional(),
    request_id: z
        .string()
        .regex(/^[\x21-\x7E]{1,256}$/, 'request_id must be 1-256 printable ASCII characters.')
        .optional()
        .describe('Optional idempotency key sent as PayPal-Request-Id. If omitted, a random one is generated per execution.')
});

const ProviderLinkSchema = z.object({
    href: z.string(),
    rel: z.string(),
    method: z.string()
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
    create_time: z.string().optional(),
    links: z.array(ProviderLinkSchema).optional()
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
    create_time: z.string().optional(),
    links: z.array(ProviderLinkSchema).optional()
});

const action = createAction({
    description: 'Create a subscription.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.paypal.com/api/subscriptions/v1/#subscriptions_create
            endpoint: '/v1/billing/subscriptions',
            headers: {
                Prefer: 'return=representation',
                // One idempotency key per execution so all internal retries resolve to the same subscription.
                'PayPal-Request-Id': input.request_id ?? randomUUID()
            },
            data: {
                plan_id: input.plan_id,
                ...(input.quantity !== undefined && { quantity: input.quantity }),
                ...(input.custom_id !== undefined && { custom_id: input.custom_id }),
                ...(input.start_time !== undefined && { start_time: input.start_time }),
                ...(input.shipping_amount !== undefined && { shipping_amount: input.shipping_amount }),
                ...(input.subscriber !== undefined && { subscriber: input.subscriber }),
                ...(input.application_context !== undefined && { application_context: input.application_context })
            },
            retries: 10
        });

        const providerSubscription = ProviderSubscriptionSchema.parse(response.data);

        return {
            id: providerSubscription.id,
            status: providerSubscription.status,
            ...(providerSubscription.status_update_time !== undefined && {
                status_update_time: providerSubscription.status_update_time
            }),
            plan_id: providerSubscription.plan_id,
            ...(providerSubscription.plan_overridden !== undefined && {
                plan_overridden: providerSubscription.plan_overridden
            }),
            ...(providerSubscription.start_time !== undefined && { start_time: providerSubscription.start_time }),
            ...(providerSubscription.quantity !== undefined && { quantity: providerSubscription.quantity }),
            ...(providerSubscription.shipping_amount !== undefined && { shipping_amount: providerSubscription.shipping_amount }),
            ...(providerSubscription.subscriber !== undefined && { subscriber: providerSubscription.subscriber }),
            ...(providerSubscription.create_time !== undefined && { create_time: providerSubscription.create_time }),
            ...(providerSubscription.links !== undefined && { links: providerSubscription.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
