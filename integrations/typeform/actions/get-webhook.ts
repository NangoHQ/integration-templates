import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    form_id: z.string().describe('Unique ID for the form. Example: "abc123"'),
    tag: z.string().describe('Unique name for the webhook. Example: "phoenix"')
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
    verify_ssl: z.boolean()
});

const OutputSchema = ProviderWebhookSchema;

const action = createAction({
    description: 'Retrieve a single webhook by tag for a Typeform form.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhooks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.typeform.com/developers/webhooks/reference/retrieve-single-webhook/
            endpoint: `/forms/${encodeURIComponent(input.form_id)}/webhooks/${encodeURIComponent(input.tag)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Webhook not found',
                form_id: input.form_id,
                tag: input.tag
            });
        }

        const webhook = ProviderWebhookSchema.parse(response.data);

        return webhook;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
