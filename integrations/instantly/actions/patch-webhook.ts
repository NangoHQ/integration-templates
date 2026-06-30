import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Webhook ID. Example: "019f1a0f-1a3c-7828-801d-069c4b11cf00"'),
    name: z.string().optional().describe('Updated webhook name.'),
    target_hook_url: z.string().optional().describe('Updated target URL for the webhook.'),
    event_type: z.string().optional().describe('Updated event type. Valid values come from GET /v2/webhooks/event-types.')
});

const ProviderWebhookSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        target_hook_url: z.string().optional(),
        event_type: z.string().optional(),
        workspace_id: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    target_hook_url: z.string().optional(),
    event_type: z.string().optional(),
    workspace_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Patch a webhook.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/patch-webhook'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhook:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://developer.instantly.ai/api-reference/groups/webhook
            endpoint: `/v2/webhooks/${encodeURIComponent(input.id)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.target_hook_url !== undefined && { target_hook_url: input.target_hook_url }),
                ...(input.event_type !== undefined && { event_type: input.event_type })
            },
            retries: 3
        });

        const providerWebhook = ProviderWebhookSchema.parse(response.data);

        return {
            id: providerWebhook.id,
            ...(providerWebhook.name !== undefined && { name: providerWebhook.name }),
            ...(providerWebhook.target_hook_url !== undefined && { target_hook_url: providerWebhook.target_hook_url }),
            ...(providerWebhook.event_type !== undefined && { event_type: providerWebhook.event_type }),
            ...(providerWebhook.workspace_id !== undefined && { workspace_id: providerWebhook.workspace_id }),
            ...(providerWebhook.created_at !== undefined && { created_at: providerWebhook.created_at }),
            ...(providerWebhook.updated_at !== undefined && { updated_at: providerWebhook.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
