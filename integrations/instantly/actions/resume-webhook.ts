import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Webhook ID to resume. Example: "019f1a45-a80d-7b4a-ba64-f5d57118477c"')
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
    description: 'Resume a paused or errored webhook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhooks:update'],
    endpoint: {
        path: '/actions/resume-webhook',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/webhook/resume-a-webhook
            endpoint: `/v2/webhooks/${encodeURIComponent(input.id)}/resume`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Webhook not found or could not be resumed',
                id: input.id
            });
        }

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
