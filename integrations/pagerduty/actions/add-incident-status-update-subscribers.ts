import { z } from 'zod';
import { createAction } from 'nango';

const SubscriberSchema = z
    .object({
        subscriber_id: z.string().describe('The ID of the entity being subscribed. Example: "PJB72P3"'),
        subscriber_type: z.enum(['user', 'team']).describe('The type of the entity being subscribed. Either "user" or "team".')
    })
    .describe('A single subscriber entity to add to an incident for status update notifications.');

const InputSchema = z
    .object({
        incident_id: z.string().describe('The ID of the incident to subscribe entities to status updates for. Example: "Q0YLGGHWAI1DDT"'),
        subscribers: z.array(SubscriberSchema).min(1).describe('Array of subscriber entities to add. Each entry requires a subscriber_id and subscriber_type.'),
        from_email: z
            .string()
            .describe('The email address of the user making the request, required by PagerDuty for incident write endpoints. Example: "api@nango.dev"')
    })
    .describe('Input for adding subscribers to incident status update notifications.');

const SubscriptionResultSchema = z
    .object({
        subscriber_id: z.string().describe('The ID of the entity being subscribed.'),
        subscriber_type: z.enum(['user', 'team']).describe('The type of the entity being subscribed.'),
        subscribable_id: z.string().describe('The ID of the entity being subscribed to.'),
        subscribable_type: z.enum(['incident', 'business_service']).describe('The type of the entity being subscribed to.'),
        account_id: z.string().describe('The ID of the account the subscription belongs to.'),
        result: z.enum(['success', 'duplicate', 'unauthorized']).describe('The resulting status of the subscription attempt.')
    })
    .describe('The outcome of a single subscription attempt for a subscriber.');

const OutputSchema = z
    .object({
        subscriptions: z.array(SubscriptionResultSchema).describe('The list of subscription results for each subscriber.')
    })
    .describe('Output containing the list of subscription results after adding incident status update subscribers.');

/**
 * @tags: [write]
 * @tagReason: Subscribes users or teams to incident status update notifications via a POST mutation.
 * @pitfalls: Re-adding an already-subscribed subscriber yields result duplicate instead of an error, and individual subscribers may return unauthorized while the overall request still returns 200.
 */
const action = createAction({
    description: 'Subscribe users or teams to status updates for a PagerDuty incident.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['subscribers.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.pagerduty.com/api-reference/594c9ed714b93-add-notification-subscribers
            endpoint: `/incidents/${encodeURIComponent(input.incident_id)}/status_updates/subscribers`,
            headers: {
                From: input.from_email
            },
            data: {
                subscribers: input.subscribers
            },
            retries: 1
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from PagerDuty API'
            });
        }

        const parsed = z.object({ subscriptions: z.array(z.unknown()) }).parse(response.data);

        const subscriptions = parsed.subscriptions.map((item: unknown) => {
            const parsedItem = SubscriptionResultSchema.safeParse(item);
            if (!parsedItem.success) {
                throw new nango.ActionError({
                    type: 'unexpected_response_item',
                    message: 'Unexpected subscription result item from PagerDuty API',
                    item: JSON.stringify(item)
                });
            }
            return parsedItem.data;
        });

        return { subscriptions };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
