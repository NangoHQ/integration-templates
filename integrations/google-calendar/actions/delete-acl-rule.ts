import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().describe('Calendar identifier. Use "primary" for the primary calendar of the currently logged in user.'),
    ruleId: z.string().describe('ACL rule identifier to delete.')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the deletion was successful.'),
    calendarId: z.string().describe('The calendar ID from the request.'),
    ruleId: z.string().describe('The ACL rule ID that was deleted.')
});

const action = createAction({
    description: 'Delete an access control rule from a calendar',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/delete-acl-rule',
        group: 'ACL'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.acls'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/acl/delete
        await nango.delete({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/acl/${encodeURIComponent(input.ruleId)}`,
            retries: 3
        });

        // On success, the API returns an empty response body
        return {
            success: true,
            calendarId: input.calendarId,
            ruleId: input.ruleId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
