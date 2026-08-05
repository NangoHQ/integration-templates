import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    webhook_id: z.number().int().positive().describe('ID of the form webhook to delete. Example: 10115')
});

const ProviderFormWebhookSchema = z
    .object({
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
        last_failure_at: z.string().nullable(),
        signing_secret: z.string().nullable().optional()
    })
    .passthrough();

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
    description: 'Delete a form webhook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://docs.usebasin.com/developer-features/api-reference/
            endpoint: `/v1/form_webhooks/${encodeURIComponent(String(input.webhook_id))}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Form webhook not found',
                webhook_id: input.webhook_id
            });
        }

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
            ...(providerWebhook.signing_secret != null && { signing_secret: providerWebhook.signing_secret })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
