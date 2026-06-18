import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the SetupIntent to update. Example: "seti_xxx"'),
    description: z.string().optional().describe('An arbitrary string attached to the object.'),
    metadata: z.record(z.string(), z.string()).optional().describe('Set of key-value pairs to attach to the object.'),
    customer: z.string().optional().describe('ID of the Customer this SetupIntent belongs to.')
});

const ProviderSetupIntentSchema = z.object({
    id: z.string(),
    object: z.string(),
    client_secret: z.string().optional(),
    created: z.number(),
    customer: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    status: z.string(),
    usage: z.string(),
    payment_method: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.string()).nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    client_secret: z.string().optional(),
    created: z.number(),
    customer: z.string().optional(),
    description: z.string().optional(),
    status: z.string(),
    usage: z.string(),
    payment_method: z.string().optional(),
    metadata: z.record(z.string(), z.string()).optional()
});

const action = createAction({
    description: 'Update a setup intent in Stripe.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = new URLSearchParams();
        if (input.description !== undefined) {
            body.append('description', input.description);
        }
        if (input.metadata !== undefined) {
            for (const [key, value] of Object.entries(input.metadata)) {
                body.append(`metadata[${key}]`, value);
            }
        }
        if (input.customer !== undefined) {
            body.append('customer', input.customer);
        }

        const config: ProxyConfiguration = {
            // https://docs.stripe.com/api/setup_intents/update
            endpoint: `/v1/setup_intents/${encodeURIComponent(input.id)}`,
            data: body.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 1
        };

        const response = await nango.post(config);

        const providerSetupIntent = ProviderSetupIntentSchema.parse(response.data);

        return {
            id: providerSetupIntent.id,
            object: providerSetupIntent.object,
            ...(providerSetupIntent.client_secret !== undefined && { client_secret: providerSetupIntent.client_secret }),
            created: providerSetupIntent.created,
            ...(providerSetupIntent.customer !== null && providerSetupIntent.customer !== undefined && { customer: providerSetupIntent.customer }),
            ...(providerSetupIntent.description !== null && providerSetupIntent.description !== undefined && { description: providerSetupIntent.description }),
            status: providerSetupIntent.status,
            usage: providerSetupIntent.usage,
            ...(providerSetupIntent.payment_method !== null &&
                providerSetupIntent.payment_method !== undefined && { payment_method: providerSetupIntent.payment_method }),
            ...(providerSetupIntent.metadata !== null && providerSetupIntent.metadata !== undefined && { metadata: providerSetupIntent.metadata })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
