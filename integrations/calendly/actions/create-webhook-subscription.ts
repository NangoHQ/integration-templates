import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    url: z.string().url().describe('The callback URL. Example: "https://example.com/webhooks"'),
    events: z.array(z.string()).describe('The events to subscribe to. Example: ["invitee.created", "invitee.canceled"]'),
    organization: z.string().url().describe('The organization URI. Example: "https://api.calendly.com/organizations/ORG123"'),
    scope: z.enum(['organization', 'user']).describe('The scope of the subscription.'),
    user: z.string().url().optional().describe('The user URI. Required when scope is "user". Example: "https://api.calendly.com/users/USER123"'),
    signing_key: z.string().optional().describe('An optional secret key used to sign webhook payloads.')
});

const WebhookSubscriptionSchema = z.object({
    uri: z.string().url(),
    callback_url: z.string().url(),
    created_at: z.string(),
    updated_at: z.string(),
    retry_started_at: z.string().nullable(),
    state: z.string(),
    events: z.array(z.string()),
    scope: z.string(),
    organization: z.string().url(),
    user: z.string().url().nullable()
});

const ProviderResponseSchema = z.object({
    resource: WebhookSubscriptionSchema
});

const OutputSchema = z.object({
    uri: z.string().url().describe('The webhook subscription URI.'),
    callback_url: z.string().url().describe('The callback URL.'),
    created_at: z.string().describe('The moment the webhook subscription was created.'),
    updated_at: z.string().describe('The moment the webhook subscription was last updated.'),
    retry_started_at: z.string().nullable().describe('The moment retries started for a failing webhook subscription.'),
    state: z.string().describe('The state of the webhook subscription.'),
    events: z.array(z.string()).describe('The events the webhook subscription is subscribed to.'),
    scope: z.string().describe('The scope of the webhook subscription.'),
    organization: z.string().url().describe('The organization URI.'),
    user: z.string().url().nullable().describe('The user URI.')
});

const action = createAction({
    description: 'Create a webhook subscription in Calendly.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-webhook-subscription',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhooks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            url: input.url,
            events: input.events,
            organization: input.organization,
            scope: input.scope
        };

        if (input.user !== undefined) {
            data['user'] = input.user;
        }

        if (input.signing_key !== undefined) {
            data['signing_key'] = input.signing_key;
        }

        // https://developer.calendly.com/api-docs/b3A6NTkxNDI1-create-webhook-subscription
        const response = await nango.post({
            endpoint: '/webhook_subscriptions',
            data,
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerWebhook = providerResponse.resource;

        return {
            uri: providerWebhook.uri,
            callback_url: providerWebhook.callback_url,
            created_at: providerWebhook.created_at,
            updated_at: providerWebhook.updated_at,
            retry_started_at: providerWebhook.retry_started_at,
            state: providerWebhook.state,
            events: providerWebhook.events,
            scope: providerWebhook.scope,
            organization: providerWebhook.organization,
            user: providerWebhook.user
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
