import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required.');

const WebhookSchema = z.object({
    key: z.string().describe('Event type key, for example review/created or review/updated.'),
    target_url: z.string().describe('URL where the provider delivers event payloads.')
});

const OutputSchema = z
    .object({
        shop_id: z.number().describe('Judge.me shop identifier.'),
        shop_domain: z.string().describe('Shop domain registered with Judge.me.'),
        webhooks: z.array(WebhookSchema).describe('Webhook subscriptions configured for the shop.')
    })
    .describe('Webhook subscriptions configured for the shop.');

/**
 * @tags: [read]
 * @tagReason: Reads existing webhook subscriptions from the provider.
 * @pitfalls: The provider HMAC-signs webhook payloads, yet the list response only exposes the event key and target URL and does not return the signing secret required to verify them.
 */
const action = createAction({
    description: 'List webhook subscriptions configured for the shop.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_settings'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://judge.me/api/docs
            endpoint: '/api/v1/webhooks',
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
