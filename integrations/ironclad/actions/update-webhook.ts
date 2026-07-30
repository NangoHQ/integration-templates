import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    webhookId: z.string().describe('The ID of the webhook to update. Example: "6a6b346ef69937b9258f29ad"'),
    events: z.array(z.string()).optional().describe('Array of event types to subscribe to. Example: ["workflow_launched", "workflow_completed"]'),
    targetURL: z.string().optional().describe('The URL to send webhook events to. Example: "https://example.com/webhook"')
});

const ProviderWebhookSchema = z.object({
    id: z.string(),
    targetURL: z.string(),
    events: z.array(z.string()),
    signatureKey: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    targetURL: z.string(),
    events: z.array(z.string()),
    signatureKey: z.string().optional()
});

const action = createAction({
    description: "Update a webhook's target URL or subscribed events.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.webhooks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: { events?: string[]; targetURL?: string } = {};

        if (input.events !== undefined) {
            body.events = input.events;
        }

        if (input.targetURL !== undefined) {
            body.targetURL = input.targetURL;
        }

        if (Object.keys(body).length === 0) {
            throw new nango.ActionError({
                type: 'missing_fields',
                message: 'At least one of events or targetURL must be provided.'
            });
        }

        const response = await nango.patch({
            // https://developer.ironcladapp.com/
            endpoint: `/public/api/v1/webhooks/${encodeURIComponent(input.webhookId)}`,
            data: body,
            retries: 3
        });

        const providerWebhook = ProviderWebhookSchema.parse(response.data);

        return {
            id: providerWebhook.id,
            targetURL: providerWebhook.targetURL,
            events: providerWebhook.events,
            ...(providerWebhook.signatureKey !== undefined && { signatureKey: providerWebhook.signatureKey })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
