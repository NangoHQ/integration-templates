import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Webhook ID to delete. Example: "019f1a0f-1a3c-7828-801d-069c4b11cf00"')
});

const ProviderWebhookSchema = z.object({
    id: z.string(),
    organization: z.string(),
    campaign: z.string().nullish(),
    name: z.string().nullish(),
    target_hook_url: z.string(),
    event_type: z.string().nullish(),
    custom_interest_value: z.number().nullish(),
    headers: z.record(z.string(), z.string()).nullish(),
    timestamp_created: z.string(),
    status: z.number().nullish(),
    timestamp_error: z.string().nullish()
});

const OutputSchema = z.object({
    id: z.string(),
    organization: z.string(),
    target_hook_url: z.string(),
    timestamp_created: z.string(),
    campaign: z.string().optional(),
    name: z.string().optional(),
    event_type: z.string().optional(),
    custom_interest_value: z.number().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    status: z.number().optional(),
    timestamp_error: z.string().optional()
});

const action = createAction({
    description: 'Delete a webhook',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhooks:delete', 'webhooks:all', 'all:delete', 'all:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.instantly.ai/api-reference/webhook/delete-webhook
            endpoint: `/v2/webhooks/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const providerWebhook = ProviderWebhookSchema.parse(response.data);

        return {
            id: providerWebhook.id,
            organization: providerWebhook.organization,
            target_hook_url: providerWebhook.target_hook_url,
            timestamp_created: providerWebhook.timestamp_created,
            ...(providerWebhook.campaign != null && { campaign: providerWebhook.campaign }),
            ...(providerWebhook.name != null && { name: providerWebhook.name }),
            ...(providerWebhook.event_type != null && { event_type: providerWebhook.event_type }),
            ...(providerWebhook.custom_interest_value != null && { custom_interest_value: providerWebhook.custom_interest_value }),
            ...(providerWebhook.headers != null && { headers: providerWebhook.headers }),
            ...(providerWebhook.status != null && { status: providerWebhook.status }),
            ...(providerWebhook.timestamp_error != null && { timestamp_error: providerWebhook.timestamp_error })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
