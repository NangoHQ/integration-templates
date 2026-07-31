import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    webhookId: z.string().describe('The ID of the webhook to retrieve. Example: "6a6b346ef69937b9258f29ad"')
});

const ProviderWebhookSchema = z
    .object({
        id: z.string(),
        targetURL: z.string(),
        events: z.array(z.string()),
        createdAt: z.string().optional().nullable(),
        updatedAt: z.string().optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    targetURL: z.string(),
    events: z.array(z.string()),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Get a single webhook by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.webhooks.readWebhooks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.ironcladapp.com
            endpoint: `/public/api/v1/webhooks/${encodeURIComponent(input.webhookId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Webhook with id ${input.webhookId} not found.`
            });
        }

        const providerWebhook = ProviderWebhookSchema.parse(response.data);

        return {
            id: providerWebhook.id,
            targetURL: providerWebhook.targetURL,
            events: providerWebhook.events,
            ...(providerWebhook.createdAt != null && { createdAt: providerWebhook.createdAt }),
            ...(providerWebhook.updatedAt != null && { updatedAt: providerWebhook.updatedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
