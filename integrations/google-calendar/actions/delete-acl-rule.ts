import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        calendarId: z.string().describe('Calendar identifier. To access calendar metadata for a primary calendar, use "primary".'),
        ruleId: z.string().describe('ACL rule identifier.')
    })
    .describe('Parameters for deleting an access control rule.');

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the deletion was successful.'),
    calendarId: z.string().describe('The calendar ID from the request.'),
    ruleId: z.string().describe('The ACL rule ID that was deleted.')
});

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes an access control rule from the calendar. This is difficult to reverse without re-creating the rule.
 * @pitfalls: You cannot remove the access rule for the owner of the calendar. Deleting a non-existent rule returns a 404 error.
 */
const action = createAction({
    description: 'Delete an access control rule',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/acl/delete
        await nango.delete({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/acl/${encodeURIComponent(input.ruleId)}`,
            retries: 3
        });

        return {
            success: true,
            calendarId: input.calendarId,
            ruleId: input.ruleId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
