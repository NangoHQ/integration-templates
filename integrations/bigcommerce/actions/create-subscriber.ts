import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().email().describe('The email of the subscriber. Example: "jane.doe@example.com"'),
    first_name: z.string().optional().describe('The first name of the subscriber. Example: "Jane"'),
    last_name: z.string().optional().describe('The last name of the subscriber. Example: "Doe"'),
    source: z.enum(['storefront', 'order', 'custom']).optional().describe('The source of the subscriber. Example: "storefront"')
});

const ProviderSubscriberSchema = z.object({
    id: z.number().optional(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    source: z.string().optional(),
    order_id: z.number().nullable().optional(),
    channel_id: z.number().optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional(),
    consents: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    id: z.number().optional(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    source: z.string().optional(),
    order_id: z.number().nullable().optional(),
    channel_id: z.number().optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional(),
    consents: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Create an email subscriber.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_customers'],

    exec: async (nango, input) => {
        const response = await nango.post({
            // https://developer.bigcommerce.com/docs/rest-management
            endpoint: '/v3/customers/subscribers',
            data: {
                email: input.email,
                ...(input.first_name !== undefined && { first_name: input.first_name }),
                ...(input.last_name !== undefined && { last_name: input.last_name }),
                ...(input.source !== undefined && { source: input.source })
            },
            retries: 3
        });

        const parsedResponse = z
            .object({
                data: ProviderSubscriberSchema.optional()
            })
            .parse(response.data);

        if (!parsedResponse.data) {
            throw new nango.ActionError({
                type: 'no_response',
                message: 'No subscriber data returned from the API.'
            });
        }

        const subscriber = parsedResponse.data;

        return {
            ...(subscriber.id !== undefined && { id: subscriber.id }),
            ...(subscriber.email !== undefined && { email: subscriber.email }),
            ...(subscriber.first_name !== undefined && { first_name: subscriber.first_name }),
            ...(subscriber.last_name !== undefined && { last_name: subscriber.last_name }),
            ...(subscriber.source !== undefined && { source: subscriber.source }),
            ...(subscriber.order_id !== undefined && { order_id: subscriber.order_id }),
            ...(subscriber.channel_id !== undefined && { channel_id: subscriber.channel_id }),
            ...(subscriber.date_created !== undefined && { date_created: subscriber.date_created }),
            ...(subscriber.date_modified !== undefined && { date_modified: subscriber.date_modified }),
            ...(subscriber.consents !== undefined && { consents: subscriber.consents })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
