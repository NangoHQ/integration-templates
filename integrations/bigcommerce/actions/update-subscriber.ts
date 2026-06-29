import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    subscriber_id: z.number().describe('The ID of the subscriber to update. Example: 1'),
    email: z.string().optional().describe('The email of the subscriber. Must be unique.'),
    first_name: z.string().optional().describe('The first name of the subscriber. Max length: 255.'),
    last_name: z.string().optional().describe('The last name of the subscriber. Max length: 255.'),
    source: z.enum(['storefront', 'order', 'custom']).optional().describe('The source of the subscriber.'),
    order_id: z.number().optional().describe('The ID of the source order, if source was order.'),
    channel_id: z.number().optional().describe('The channel ID where the subscriber was created.'),
    consents: z
        .array(z.enum(['marketing_newsletter', 'abandoned_cart']))
        .optional()
        .describe('Array of consent values.')
});

const ProviderSubscriberSchema = z.object({
    id: z.number(),
    email: z.string().optional(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    source: z.string().optional().nullable(),
    order_id: z.number().optional().nullable(),
    channel_id: z.number().optional().nullable(),
    consents: z.array(z.string()).optional().nullable(),
    date_created: z.string().optional().nullable(),
    date_modified: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.number(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    source: z.string().optional(),
    order_id: z.number().optional(),
    channel_id: z.number().optional(),
    consents: z.array(z.string()).optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional()
});

const action = createAction({
    description: 'Update an email subscriber.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};
        if (input.email !== undefined) {
            body['email'] = input.email;
        }
        if (input.first_name !== undefined) {
            body['first_name'] = input.first_name;
        }
        if (input.last_name !== undefined) {
            body['last_name'] = input.last_name;
        }
        if (input.source !== undefined) {
            body['source'] = input.source;
        }
        if (input.order_id !== undefined) {
            body['order_id'] = input.order_id;
        }
        if (input.channel_id !== undefined) {
            body['channel_id'] = input.channel_id;
        }
        if (input.consents !== undefined) {
            body['consents'] = input.consents;
        }

        const response = await nango.put({
            // https://developer.bigcommerce.com/docs/rest-management/subscribers
            endpoint: `/v3/customers/subscribers/${encodeURIComponent(input.subscriber_id)}`,
            data: body,
            retries: 10
        });

        const responseSchema = z.object({
            data: ProviderSubscriberSchema,
            meta: z.object({}).passthrough().optional()
        });

        const parsedResponse = responseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from BigCommerce API.'
            });
        }

        const providerSubscriber = parsedResponse.data.data;

        return {
            id: providerSubscriber.id,
            ...(providerSubscriber.email !== undefined && { email: providerSubscriber.email }),
            ...(providerSubscriber.first_name != null && { first_name: providerSubscriber.first_name }),
            ...(providerSubscriber.last_name != null && { last_name: providerSubscriber.last_name }),
            ...(providerSubscriber.source != null && { source: providerSubscriber.source }),
            ...(providerSubscriber.order_id != null && { order_id: providerSubscriber.order_id }),
            ...(providerSubscriber.channel_id != null && { channel_id: providerSubscriber.channel_id }),
            ...(providerSubscriber.consents != null && { consents: providerSubscriber.consents }),
            ...(providerSubscriber.date_created != null && { date_created: providerSubscriber.date_created }),
            ...(providerSubscriber.date_modified != null && { date_modified: providerSubscriber.date_modified })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
