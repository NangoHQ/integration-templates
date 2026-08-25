import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        event: z
            .enum(['review/created', 'review/updated', 'review/published', 'review/unpublished'])
            .describe('Review lifecycle event to subscribe to. Example: "review/created"'),
        callback_url: z.string().url().describe('The URL Judge.me will POST to when the event occurs.')
    })
    .describe('Input for creating a Judge.me webhook subscription.');

const ProviderWebhookSchema = z.object({
    id: z.number(),
    failure_count: z.number(),
    key: z.string(),
    url: z.string()
});

const ProviderResponseSchema = z.object({
    shop_id: z.number(),
    shop_domain: z.string(),
    webhook: ProviderWebhookSchema
});

const OutputSchema = z
    .object({
        shop_id: z.number().describe('Judge.me internal ID of the shop.'),
        shop_domain: z.string().describe('Domain of the shop the webhook belongs to.'),
        webhook: z
            .object({
                id: z.number().describe('Judge.me internal ID of the webhook.'),
                failure_count: z.number().describe('Number of consecutive failed delivery attempts.'),
                key: z.string().describe('The event key this webhook is subscribed to.'),
                url: z.string().describe('The callback URL Judge.me will POST to when the event occurs.')
            })
            .describe('The created webhook subscription.')
    })
    .describe('Output of a created Judge.me webhook subscription.');

/**
 * @tags: [write]
 * @tagReason: Creates a new webhook subscription on the Judge.me store.
 * @pitfalls: Duplicate webhooks for the same event and callback URL are rejected with HTTP 422.
 */
const action = createAction({
    description: 'Register a webhook subscription for a review lifecycle event.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://judge.me/api/docs
            endpoint: '/api/v1/webhooks',
            data: {
                webhook: {
                    key: input.event,
                    url: input.callback_url
                }
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            shop_id: providerResponse.shop_id,
            shop_domain: providerResponse.shop_domain,
            webhook: {
                id: providerResponse.webhook.id,
                failure_count: providerResponse.webhook.failure_count,
                key: providerResponse.webhook.key,
                url: providerResponse.webhook.url
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
