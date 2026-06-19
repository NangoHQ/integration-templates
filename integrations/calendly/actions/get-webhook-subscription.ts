import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    uuid: z.string().describe('The unique identifier of the webhook subscription. Example: "AAAAAAAAAAAAAAAA"')
});

const ProviderWebhookSubscriptionSchema = z.object({
    uri: z.string(),
    callback_url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    retry_started_at: z.string().nullable().optional(),
    state: z.string(),
    events: z.array(z.string()),
    scope: z.string(),
    organization: z.string(),
    user: z.string().nullable().optional(),
    creator: z.string().nullable().optional(),
    group: z.string().nullable().optional()
});

const OutputSchema = z.object({
    uri: z.string().describe('Canonical reference (unique identifier) for the webhook subscription.'),
    callback_url: z.string().describe('The callback URL to use when the event is triggered.'),
    created_at: z.string().describe('The moment when the webhook subscription was created.'),
    updated_at: z.string().describe('The moment when the webhook subscription was last updated.'),
    retry_started_at: z.string().nullable().optional().describe('The date and time the webhook subscription retry started.'),
    state: z.string().describe('Indicates if the webhook subscription is active or disabled.'),
    events: z.array(z.string()).describe('A list of events to which the webhook is subscribed.'),
    scope: z.string().describe('The scope of the webhook subscription.'),
    organization: z.string().describe('The organization associated with the webhook subscription.'),
    user: z.string().nullable().optional().describe('The user associated with the webhook subscription.'),
    creator: z.string().nullable().optional().describe('The user who created the webhook subscription.'),
    group: z.string().nullable().optional().describe('The group associated with the webhook subscription.')
});

const action = createAction({
    description: 'Retrieve a single webhook subscription from Calendly.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhooks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch Map a 404 from the provider to a typed ActionError so callers get a clear "not found" message instead of a generic HTTP exception.
        try {
            response = await nango.get({
                // https://developer.calendly.com/api-docs/4d800dc2cb119-get-webhook-subscription
                endpoint: `/webhook_subscriptions/${input.uuid}`,
                retries: 3
            });
        } catch (error) {
            if (typeof error === 'object' && error !== null && 'status' in error && error.status === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Webhook subscription not found',
                    uuid: input.uuid
                });
            }
            throw error;
        }

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Webhook subscription not found or invalid response',
                uuid: input.uuid
            });
        }

        const responseWrapper = z.object({ resource: z.unknown() }).parse(response.data);
        const resource = ProviderWebhookSubscriptionSchema.parse(responseWrapper.resource);

        return {
            uri: resource.uri,
            callback_url: resource.callback_url,
            created_at: resource.created_at,
            updated_at: resource.updated_at,
            ...(resource.retry_started_at !== undefined && resource.retry_started_at !== null && { retry_started_at: resource.retry_started_at }),
            state: resource.state,
            events: resource.events,
            scope: resource.scope,
            organization: resource.organization,
            ...(resource.user !== undefined && resource.user !== null && { user: resource.user }),
            ...(resource.creator !== undefined && resource.creator !== null && { creator: resource.creator }),
            ...(resource.group !== undefined && resource.group !== null && { group: resource.group })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
