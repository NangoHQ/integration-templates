import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z
        .string()
        .describe(
            'Calendar identifier. To retrieve calendar IDs call the calendarList.list method. If you want to access the primary calendar of the currently logged in user, use the "primary" keyword. Example: "primary" or "abc123xyz@group.calendar.google.com"'
        ),
    summary: z.string().optional().describe('Title of the calendar.'),
    description: z.string().optional().describe('Description of the calendar.'),
    location: z.string().optional().describe('Geographic location of the calendar as free-form text.'),
    timeZone: z.string().optional().describe('The time zone of the calendar. Formatted as an IANA Time Zone Database name, e.g. "Europe/Zurich".')
});

const OutputSchema = z.object({
    id: z.string(),
    summary: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    timeZone: z.string().optional(),
    kind: z.string(),
    etag: z.string(),
    dataOwner: z.string().optional(),
    autoAcceptInvitations: z.boolean().optional(),
    conferenceProperties: z
        .object({
            allowedConferenceSolutionTypes: z.array(z.string())
        })
        .optional()
});

const action = createAction({
    description: "Update a calendar's metadata",
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/update-calendar',
        group: 'Calendars'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.app.created',
        'https://www.googleapis.com/auth/calendar.calendars'
    ],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/calendars/update
        const response = await nango.put({
            endpoint: `/calendar/v3/calendars/${input.calendarId}`,
            data: {
                ...(input.summary && { summary: input.summary }),
                ...(input.description && { description: input.description }),
                ...(input.location && { location: input.location }),
                ...(input.timeZone && { timeZone: input.timeZone })
            },
            retries: 3
        });

        const data = response.data;

        return {
            id: data.id,
            summary: data.summary,
            description: data.description ?? undefined,
            location: data.location ?? undefined,
            timeZone: data.timeZone ?? undefined,
            kind: data.kind,
            etag: data.etag,
            dataOwner: data.dataOwner ?? undefined,
            autoAcceptInvitations: data.autoAcceptInvitations ?? undefined,
            conferenceProperties: data.conferenceProperties
                ? {
                      allowedConferenceSolutionTypes: data.conferenceProperties.allowedConferenceSolutionTypes ?? []
                  }
                : undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
