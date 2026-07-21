import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The unique identifier of the webhook to update. Example: 12345'),
    url: z.string().describe('The URL to POST batches of events. Example: "https://example.com/webhook"'),
    description: z.string().nullable().optional().describe('An optional description of the webhook'),
    events: z.array(z.string()).optional().describe('Optional list of event types that will trigger the webhook')
});

const ProviderWebhookSchema = z.object({
    id: z.number(),
    url: z.string(),
    auth_key: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    events: z.array(z.string()).optional(),
    created_at: z.string(),
    last_sent_at: z.string().nullable().optional(),
    batches_sent: z.number(),
    events_sent: z.number(),
    last_error: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    url: z.string(),
    auth_key: z.string().optional(),
    description: z.string().optional(),
    events: z.array(z.string()).optional(),
    created_at: z.string(),
    last_sent_at: z.string().optional(),
    batches_sent: z.number(),
    events_sent: z.number(),
    last_error: z.string().optional()
});

const action = createAction({
    description: "Update an existing webhook's url, description, or subscribed events.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/webhooks/update-webhook/
            endpoint: '1.0/webhooks/update',
            data: {
                id: input.id,
                url: input.url,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.events !== undefined && { events: input.events })
            },
            retries: 3
        });

        const providerWebhook = ProviderWebhookSchema.parse(response.data);

        return {
            id: providerWebhook.id,
            url: providerWebhook.url,
            ...(providerWebhook.auth_key != null && { auth_key: providerWebhook.auth_key }),
            ...(providerWebhook.description != null && { description: providerWebhook.description }),
            ...(providerWebhook.events != null && { events: providerWebhook.events }),
            created_at: providerWebhook.created_at,
            ...(providerWebhook.last_sent_at != null && { last_sent_at: providerWebhook.last_sent_at }),
            batches_sent: providerWebhook.batches_sent,
            events_sent: providerWebhook.events_sent,
            ...(providerWebhook.last_error != null && { last_error: providerWebhook.last_error })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
