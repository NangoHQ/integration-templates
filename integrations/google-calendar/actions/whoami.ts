import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    // No input required for whoami action
});

const OutputSchema = z.object({
    id: z.string().describe('Google account ID'),
    email: z.string().describe('Google account email address')
});

const action = createAction({
    description: "Return the current user's Google account ID and email",
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/whoami',
        group: 'Users'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/calendar/api/v3/reference/calendarList/list
        const response = await nango.get({
            endpoint: '/calendar/v3/users/me/calendarList',
            retries: 3
        });

        if (!response.data || !response.data.items || response.data.items.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Unable to retrieve user information from calendar list'
            });
        }

        // Find the primary calendar to get user info
        const primaryCalendar = response.data.items.find((cal: any) => cal.primary === true);

        if (!primaryCalendar) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Primary calendar not found'
            });
        }

        // The calendar ID for the primary calendar is typically the user's email
        // The user ID can be found in the owner information
        const userEmail = primaryCalendar.id;
        const userId = primaryCalendar.creator?.id || primaryCalendar.owner?.id || primaryCalendar.id;

        return {
            id: userId,
            email: userEmail
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
