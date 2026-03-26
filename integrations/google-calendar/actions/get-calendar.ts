import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z
        .string()
        .describe(
            'Calendar identifier. To retrieve calendar IDs call the calendarList.list method. If you want to access the primary calendar of the currently logged in user, use the "primary" keyword.'
        )
});

const OutputSchema = z.object({
    id: z.string(),
    summary: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    timeZone: z.string().optional(),
    etag: z.string(),
    kind: z.string()
});

const action = createAction({
    description: 'Get a calendar by ID',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/get-calendar',
        group: 'Calendars'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/calendars/get
        const response = await nango.get({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Calendar not found',
                calendarId: input.calendarId
            });
        }

        return {
            id: response.data.id,
            summary: response.data.summary,
            description: response.data.description ?? undefined,
            location: response.data.location ?? undefined,
            timeZone: response.data.timeZone ?? undefined,
            etag: response.data.etag,
            kind: response.data.kind
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
