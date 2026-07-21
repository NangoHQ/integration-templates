import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    url: z.string().describe('The URL to POST batches of events. Example: "https://example.com/webhook"'),
    description: z.string().optional().describe('An optional description of the webhook'),
    events: z
        .array(z.string())
        .optional()
        .describe(
            'Optional list of event types that will trigger the webhook. Examples: ["send", "hard_bounce", "soft_bounce", "open", "click", "spam", "unsub", "reject"]'
        )
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
    id: z.number().describe('Unique identifier for the webhook'),
    url: z.string().describe('The URL where webhook events will be posted'),
    auth_key: z.string().optional().describe('The key used for webhook authentication'),
    description: z.string().optional().describe('Description of the webhook'),
    events: z.array(z.string()).optional().describe('Event types that will trigger the webhook'),
    created_at: z.string().describe('When the webhook was created (UTC YYYY-MM-DD HH:MM:SS.microseconds)'),
    last_sent_at: z.string().optional().describe('When the last event was sent to this webhook (UTC YYYY-MM-DD HH:MM:SS)'),
    batches_sent: z.number().describe('Number of batches sent to this webhook'),
    events_sent: z.number().describe('Total number of events sent to this webhook'),
    last_error: z.string().optional().describe('Last error message received when attempting to call the webhook')
});

const action = createAction({
    description: 'Add a new webhook for account events',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/webhooks/add-webhook/
            endpoint: '/1.0/webhooks/add',
            data: {
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
