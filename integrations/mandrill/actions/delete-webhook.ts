import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The unique identifier of a webhook belonging to this account. Example: 12345')
});

const ProviderWebhookSchema = z.object({
    id: z.number(),
    url: z.string(),
    auth_key: z.string().nullish(),
    description: z.string().nullish(),
    events: z.array(z.string()),
    created_at: z.string(),
    last_sent_at: z.string().nullish(),
    batches_sent: z.number(),
    events_sent: z.number(),
    last_error: z.string().nullish()
});

const OutputSchema = z.object({
    id: z.number(),
    url: z.string(),
    auth_key: z.string().optional(),
    description: z.string().optional(),
    events: z.array(z.string()),
    created_at: z.string(),
    last_sent_at: z.string().optional(),
    batches_sent: z.number(),
    events_sent: z.number(),
    last_error: z.string().optional()
});

const action = createAction({
    description: 'Delete an existing webhook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/webhooks/delete-webhook/
            endpoint: '/1.0/webhooks/delete',
            data: {
                id: input.id
            },
            retries: 10
        });

        const providerWebhook = ProviderWebhookSchema.parse(response.data);

        return {
            id: providerWebhook.id,
            url: providerWebhook.url,
            events: providerWebhook.events,
            created_at: providerWebhook.created_at,
            batches_sent: providerWebhook.batches_sent,
            events_sent: providerWebhook.events_sent,
            ...(providerWebhook.auth_key != null && { auth_key: providerWebhook.auth_key }),
            ...(providerWebhook.description != null && { description: providerWebhook.description }),
            ...(providerWebhook.last_sent_at != null && { last_sent_at: providerWebhook.last_sent_at }),
            ...(providerWebhook.last_error != null && { last_error: providerWebhook.last_error })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
