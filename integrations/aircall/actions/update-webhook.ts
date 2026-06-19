import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    webhook_id: z.string().describe('Webhook UUID. Example: "c2501111-8a69-4342-bb34-bcd6cfe564ac"'),
    url: z.string().url().describe('Webhook URL. Must be a valid HTTPS URL. Example: "https://example.com/webhook"'),
    events: z.array(z.string()).optional().describe('List of events to subscribe to. Example: ["contact.created", "contact.updated"]'),
    active: z.boolean().optional().describe('Whether the webhook is active.'),
    custom_name: z.string().optional().describe('Custom name for the webhook. Default is "Webhook".')
});

const ProviderWebhookSchema = z.object({
    webhook_id: z.string(),
    direct_link: z.string(),
    created_at: z.string(),
    url: z.string(),
    active: z.boolean(),
    token: z.string(),
    events: z.array(z.string()),
    custom_name: z.string().optional()
});

const action = createAction({
    description: 'Update a webhook subscription in Aircall.',
    version: '1.0.0',
    input: InputSchema,
    output: ProviderWebhookSchema,
    endpoint: {
        path: '/actions/update-webhook',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof ProviderWebhookSchema>> => {
        const body: Record<string, unknown> = {
            url: input.url
        };

        if (input.events !== undefined) {
            body['events'] = input.events;
        }

        if (input.active !== undefined) {
            body['active'] = input.active;
        }

        if (input.custom_name !== undefined) {
            body['custom_name'] = input.custom_name;
        }

        const config: ProxyConfiguration = {
            // https://developer.aircall.io/api-references/#update-a-webhook
            endpoint: `/v1/webhooks/${encodeURIComponent(input.webhook_id)}`,
            data: body,
            retries: 3
        };

        const response = await nango.put(config);

        const responseSchema = z.object({
            webhook: z.unknown()
        });

        const parsedResponse = responseSchema.parse(response.data);
        const providerWebhook = ProviderWebhookSchema.parse(parsedResponse.webhook);

        return providerWebhook;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
