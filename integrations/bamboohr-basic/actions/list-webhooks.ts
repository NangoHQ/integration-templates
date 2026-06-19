import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const WebhookSchema = z.object({
    id: z.string().describe('The ID of the webhook. Example: "123"'),
    name: z.string().describe('The name of the webhook.'),
    created: z.string().describe('The creation date of the webhook.'),
    lastSent: z.string().nullable().describe('The date the webhook was last sent, or null if never sent.'),
    url: z.string().describe('The URL of the webhook.')
});

const OutputSchema = z.object({
    webhooks: z.array(WebhookSchema)
});

const action = createAction({
    description: 'List webhook subscriptions in BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/list-webhooks
            endpoint: '/v1/webhooks',
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from BambooHR webhooks endpoint.'
            });
        }

        const parsed = OutputSchema.parse(raw);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
