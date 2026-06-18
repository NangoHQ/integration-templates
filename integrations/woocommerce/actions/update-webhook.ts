import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Webhook ID. Example: 1'),
    name: z.string().optional().describe('A friendly name for the webhook.'),
    status: z.enum(['active', 'paused', 'disabled']).optional().describe('Webhook status. Options: active, paused, disabled.'),
    topic: z.string().optional().describe('Webhook topic. Example: order.updated'),
    delivery_url: z.string().optional().describe('The URL where the webhook payload is delivered.'),
    secret: z.string().optional().describe('Secret key used to generate a hash of the delivered webhook.')
});

const ProviderWebhookSchema = z.object({
    id: z.number(),
    name: z.string(),
    status: z.string(),
    topic: z.string(),
    resource: z.string(),
    event: z.string(),
    hooks: z.array(z.string()),
    delivery_url: z.string(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    date_modified: z.string().optional(),
    date_modified_gmt: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    status: z.string(),
    topic: z.string(),
    resource: z.string(),
    event: z.string(),
    hooks: z.array(z.string()),
    delivery_url: z.string(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    date_modified: z.string().optional(),
    date_modified_gmt: z.string().optional()
});

const action = createAction({
    description: 'Update a webhook in WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {};
        if (input.name !== undefined) {
            payload['name'] = input.name;
        }
        if (input.status !== undefined) {
            payload['status'] = input.status;
        }
        if (input.topic !== undefined) {
            payload['topic'] = input.topic;
        }
        if (input.delivery_url !== undefined) {
            payload['delivery_url'] = input.delivery_url;
        }
        if (input.secret !== undefined) {
            payload['secret'] = input.secret;
        }

        // https://woocommerce.github.io/woocommerce-rest-api-docs/#update-a-webhook
        const response = await nango.patch({
            endpoint: `/wp-json/wc/v3/webhooks/${encodeURIComponent(String(input.id))}`,
            data: payload,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid or empty response from WooCommerce API.'
            });
        }

        const providerWebhook = ProviderWebhookSchema.parse(response.data);

        return {
            id: providerWebhook.id,
            name: providerWebhook.name,
            status: providerWebhook.status,
            topic: providerWebhook.topic,
            resource: providerWebhook.resource,
            event: providerWebhook.event,
            hooks: providerWebhook.hooks,
            delivery_url: providerWebhook.delivery_url,
            ...(providerWebhook.date_created !== undefined && { date_created: providerWebhook.date_created }),
            ...(providerWebhook.date_created_gmt !== undefined && { date_created_gmt: providerWebhook.date_created_gmt }),
            ...(providerWebhook.date_modified !== undefined && { date_modified: providerWebhook.date_modified }),
            ...(providerWebhook.date_modified_gmt !== undefined && { date_modified_gmt: providerWebhook.date_modified_gmt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
