import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the webhook to retrieve. Example: "019f1a0f-1a3c-7828-801d-069c4b11cf00"')
});

const ProviderWebhookSchema = z.object({
    id: z.string(),
    organization: z.string(),
    campaign: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    target_hook_url: z.string(),
    event_type: z.string().nullable().optional(),
    custom_interest_value: z.number().nullable().optional(),
    headers: z.record(z.string(), z.string()).nullable().optional(),
    timestamp_created: z.string(),
    status: z.number().nullable().optional(),
    timestamp_error: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    organization: z.string(),
    campaign: z.string().optional(),
    name: z.string().optional(),
    target_hook_url: z.string(),
    event_type: z.string().optional(),
    custom_interest_value: z.number().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    timestamp_created: z.string(),
    status: z.number().optional(),
    timestamp_error: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a webhook.',
    version: '1.0.0',
    endpoint: {
        path: '/actions/get-webhook',
        method: 'GET'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhooks:read', 'webhooks:all', 'all:read', 'all:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.instantly.ai/api-reference/webhook/get-webhook
            endpoint: `/v2/webhooks/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Webhook not found',
                id: input.id
            });
        }

        const webhook = ProviderWebhookSchema.parse(response.data);

        return {
            id: webhook.id,
            organization: webhook.organization,
            target_hook_url: webhook.target_hook_url,
            timestamp_created: webhook.timestamp_created,
            ...(webhook.campaign != null && { campaign: webhook.campaign }),
            ...(webhook.name != null && { name: webhook.name }),
            ...(webhook.event_type != null && { event_type: webhook.event_type }),
            ...(webhook.custom_interest_value != null && { custom_interest_value: webhook.custom_interest_value }),
            ...(webhook.headers != null && { headers: webhook.headers }),
            ...(webhook.status != null && { status: webhook.status }),
            ...(webhook.timestamp_error != null && { timestamp_error: webhook.timestamp_error })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
