import { z } from 'zod';
import { createAction } from 'nango';

const AircallEvent = z.union([
    z.literal('call.created'),
    z.literal('call.answered'),
    z.literal('call.ended'),
    z.literal('call.hungup'),
    z.literal('call.archived'),
    z.literal('contact.created'),
    z.literal('contact.updated'),
    z.literal('contact.deleted'),
    z.literal('number.opened'),
    z.literal('number.closed'),
    z.literal('tag.created'),
    z.literal('tag.updated'),
    z.literal('tag.deleted'),
    z.literal('user.created'),
    z.literal('user.updated'),
    z.literal('user.deleted')
]);

const InputSchema = z.object({
    url: z.string().describe('Webhook URL to receive events. Example: "https://example.com/webhook"'),
    events: z.array(AircallEvent).describe('List of events to subscribe to. Example: ["call.created", "contact.updated"]')
});

const WebhookSchema = z.object({
    webhook_id: z.string().describe('UUID string identifier. Example: "13f9cf11-cc5b-4e6d-830c-a858f45cf792"'),
    url: z.string().describe('Webhook URL. Example: "https://example.com/webhook"'),
    active: z.boolean().describe('Whether the webhook is active.'),
    events: z.array(z.string()).describe('Subscribed events. Example: ["call.created", "contact.updated"]'),
    token: z.string().describe('Webhook token for verification.'),
    created_at: z.string().describe('ISO timestamp when the webhook was created.'),
    direct_link: z.string().describe('Direct API URL for the webhook.')
});

const OutputSchema = z.object({
    webhook: WebhookSchema
});

const action = createAction({
    description: 'Create a webhook subscription in Aircall.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.aircall.io/api-references/#webhooks
            endpoint: '/v1/webhooks',
            data: {
                url: input.url,
                events: input.events
            },
            retries: 3
        });

        const parsed = z.object({ webhook: WebhookSchema }).parse(response.data);

        return {
            webhook: parsed.webhook
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
