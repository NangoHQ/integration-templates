import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The ID of the incident whose status-update subscribers to list.'),
        limit: z.number().optional().describe('Maximum number of subscribers to return per page.'),
        offset: z.number().optional().describe('Pagination offset to start from.')
    })
    .describe('Input for listing incident status update subscribers.');

const SubscribedViaSchema = z
    .object({
        id: z.string().describe('The ID of the object this subscriber is subscribed via.'),
        type: z.string().optional().describe('The type of the object this subscriber is subscribed via.'),
        name: z.string().optional().describe('The name of the object this subscriber is subscribed via.')
    })
    .describe('An object through which a subscriber is indirectly subscribed.');

const SubscriberSchema = z
    .object({
        subscriber_id: z.string().describe('The ID of the subscribed entity.'),
        subscriber_type: z.string().describe('The type of the subscribed entity (user or team).'),
        has_indirect_subscription: z.boolean().describe('Whether the subscriber has an indirect subscription via another object.'),
        subscribed_via: z.array(SubscribedViaSchema).nullable().optional().describe('Objects through which this subscriber is indirectly subscribed.')
    })
    .describe('A notification subscriber for an incident.');

const OutputSchema = z
    .object({
        subscribers: z.array(SubscriberSchema).describe('List of notification subscribers for the incident.'),
        limit: z.number().describe('Echoes the limit pagination property.'),
        offset: z.number().describe('Echoes the offset pagination property.'),
        more: z.boolean().describe('Whether additional records are available.'),
        total: z.number().nullable().optional().describe('Total number of records matching the query, if requested.'),
        account_id: z.string().optional().describe('The ID of the account belonging to the subscriber entities.')
    })
    .describe('Output of listing incident status update subscribers.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of users and teams subscribed to status updates for an incident.
 * @pitfalls: Only explicitly added status-update subscribers are returned; incident assignees and escalation policy members do not appear unless individually subscribed.
 */
const action = createAction({
    description: 'List users/teams subscribed to status updates for an incident.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['subscribers.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/
            endpoint: `/incidents/${encodeURIComponent(input.id)}/status_updates/subscribers`,
            params: {
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.offset !== undefined && { offset: String(input.offset) })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            subscribers: z.array(z.unknown()),
            limit: z.number(),
            offset: z.number(),
            more: z.boolean(),
            total: z.number().nullable().optional(),
            account_id: z.string().optional()
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const subscribers = parsed.subscribers.map((item) => {
            const subscriber = z
                .object({
                    subscriber_id: z.string(),
                    subscriber_type: z.string(),
                    has_indirect_subscription: z.boolean(),
                    subscribed_via: z
                        .array(
                            z.object({
                                id: z.string(),
                                type: z.string().optional(),
                                name: z.string().optional()
                            })
                        )
                        .nullable()
                        .optional()
                })
                .parse(item);

            return {
                subscriber_id: subscriber.subscriber_id,
                subscriber_type: subscriber.subscriber_type,
                has_indirect_subscription: subscriber.has_indirect_subscription,
                ...(subscriber.subscribed_via !== undefined &&
                    subscriber.subscribed_via !== null && {
                        subscribed_via: subscriber.subscribed_via
                    })
            };
        });

        return {
            subscribers,
            limit: parsed.limit,
            offset: parsed.offset,
            more: parsed.more,
            ...(parsed.total !== undefined && { total: parsed.total }),
            ...(parsed.account_id !== undefined && { account_id: parsed.account_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
