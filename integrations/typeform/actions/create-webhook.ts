import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    form_id: z.string().describe('Unique ID for the form. Example: "WMpBq4vc"'),
    tag: z.string().describe('Unique name you want to use for the webhook. Example: "my-webhook"'),
    url: z.string().describe('Webhook URL. Example: "https://example.com/webhook"'),
    enabled: z.boolean().describe('True if you want to send responses to the webhook immediately. Otherwise, false.'),
    event_types: z
        .record(z.string(), z.boolean())
        .describe('Object specifying the event types to which this webhook is subscribed. Example: {"form_response": true}'),
    secret: z
        .string()
        .optional()
        .describe('If specified, will be used to sign the webhook payload with HMAC SHA256, so that you can verify that it came from Typeform.')
});

const ProviderWebhookSchema = z.object({
    created_at: z.string(),
    enabled: z.boolean(),
    event_types: z.record(z.string(), z.boolean()),
    form_id: z.string(),
    id: z.string(),
    secret: z.string().optional(),
    tag: z.string(),
    updated_at: z.string(),
    url: z.string(),
    verify_ssl: z.boolean().optional()
});

const OutputSchema = ProviderWebhookSchema;

const action = createAction({
    description: 'Create or update a webhook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhooks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://www.typeform.com/developers/webhooks/reference/create-or-update-webhook/
            endpoint: `/forms/${encodeURIComponent(input.form_id)}/webhooks/${encodeURIComponent(input.tag)}`,
            data: {
                url: input.url,
                enabled: input.enabled,
                event_types: input.event_types,
                ...(input.secret !== undefined && { secret: input.secret })
            },
            retries: 10
        });

        const webhook = ProviderWebhookSchema.parse(response.data);

        return webhook;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
