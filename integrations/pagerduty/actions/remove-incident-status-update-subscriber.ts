import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        incident_id: z.string().describe('The ID of the incident to remove the status-update subscriber from.'),
        subscriber_id: z.string().describe('The ID of the user or team to unsubscribe.'),
        subscriber_type: z.enum(['user', 'team']).describe('The type of the entity being unsubscribed.')
    })
    .describe('Input for removing an incident status-update subscriber.');

const OutputSchema = z
    .object({
        deleted_count: z.number().describe('Number of subscribers successfully removed.'),
        unauthorized_count: z.number().describe('Number of subscribers that could not be removed due to insufficient permissions.'),
        non_existent_count: z.number().describe('Number of subscribers that did not exist.')
    })
    .describe('Result of removing an incident status-update subscriber.');

/**
 * @tags: [write]
 * @tagReason: Unsubscribes a user or team from incident status-update notifications.
 * @pitfalls: A 200 response does not guarantee removal; inspect `deleted_count` to confirm. A subscriber that was never subscribed or does not exist returns 200 with `deleted_count: 0`.
 */
const action = createAction({
    description: 'Unsubscribe a single user or team from status updates for an incident.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['subscribers.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.pagerduty.com/api-reference/6db95f2348929-remove-notification-subscriber
            endpoint: `/incidents/${encodeURIComponent(input.incident_id)}/status_updates/unsubscribe`,
            data: {
                subscribers: [
                    {
                        subscriber_id: input.subscriber_id,
                        subscriber_type: input.subscriber_type
                    }
                ]
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
