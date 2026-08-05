import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Form webhook ID. Example: 10113'),
    form_id: z.number().optional().describe('ID of the associated form.'),
    name: z.string().optional().describe('Webhook name.'),
    url: z.string().optional().describe('Webhook URL.'),
    format: z.string().optional().describe('Webhook format (e.g., json, slack).'),
    trigger_when_spam: z.boolean().optional().describe('Whether to trigger on spam submissions.'),
    enabled: z.boolean().optional().describe('Whether the webhook is enabled.')
});

const ProviderFormWebhookSchema = z.object({
    id: z.number(),
    form_id: z.number(),
    name: z.string(),
    url: z.string(),
    format: z.string(),
    trigger_when_spam: z.boolean(),
    enabled: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    failure_count: z.number(),
    last_failure_at: z.string().nullable().optional(),
    signing_secret: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    form_id: z.number(),
    name: z.string(),
    url: z.string(),
    format: z.string(),
    trigger_when_spam: z.boolean(),
    enabled: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    failure_count: z.number(),
    last_failure_at: z.string().optional(),
    signing_secret: z.string().optional()
});

const action = createAction({
    description: 'Update an existing form webhook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateBody: Record<string, unknown> = {};

        if (input.form_id !== undefined) {
            updateBody['form_id'] = input.form_id;
        }
        if (input.name !== undefined) {
            updateBody['name'] = input.name;
        }
        if (input.url !== undefined) {
            updateBody['url'] = input.url;
        }
        if (input.format !== undefined) {
            updateBody['format'] = input.format;
        }
        if (input.trigger_when_spam !== undefined) {
            updateBody['trigger_when_spam'] = input.trigger_when_spam;
        }
        if (input.enabled !== undefined) {
            updateBody['enabled'] = input.enabled;
        }

        const response = await nango.put({
            // https://docs.usebasin.com/developer-features/api-reference/
            endpoint: `/v1/form_webhooks/${encodeURIComponent(String(input.id))}`,
            data: updateBody,
            retries: 3
        });

        const providerWebhook = ProviderFormWebhookSchema.parse(response.data);

        return {
            id: providerWebhook.id,
            form_id: providerWebhook.form_id,
            name: providerWebhook.name,
            url: providerWebhook.url,
            format: providerWebhook.format,
            trigger_when_spam: providerWebhook.trigger_when_spam,
            enabled: providerWebhook.enabled,
            created_at: providerWebhook.created_at,
            updated_at: providerWebhook.updated_at,
            failure_count: providerWebhook.failure_count,
            ...(providerWebhook.last_failure_at != null && { last_failure_at: providerWebhook.last_failure_at }),
            ...(providerWebhook.signing_secret !== undefined && { signing_secret: providerWebhook.signing_secret })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
