import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        user_id: z.string().describe('The ID of the user whose notification rule should be deleted.'),
        notification_rule_id: z.string().describe('The ID of the notification rule to delete.')
    })
    .describe('Input to delete a user notification rule in PagerDuty.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes a notification rule from a user in PagerDuty.
 */
const action = createAction({
    description: 'Delete a notification rule from a user.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response confirming the notification rule was deleted.'),
    scopes: ['users:write'],

    exec: async (nango, input): Promise<null> => {
        // https://developer.pagerduty.com/api-reference/reference/REST/openapiv3.json/paths/~1users~1%7Bid%7D~1notification_rules~1%7Bnotification_rule_id%7D/delete
        await nango.delete({
            endpoint: `/users/${encodeURIComponent(input.user_id)}/notification_rules/${encodeURIComponent(input.notification_rule_id)}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
