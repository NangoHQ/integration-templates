import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    webhook_id: z.number().describe('ID of the form webhook to delete. Example: 10115')
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
        last_failure_at: z.string().nullable()
    })
    .passthrough();

const OutputSchema = z
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
        last_failure_at: z.string().optional()
    })
    .passthrough();

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

        const providerWebhook = ProviderFormWebhookSchema.parse(response.data);

        return {
            ...providerWebhook,
            last_failure_at: providerWebhook.last_failure_at ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
