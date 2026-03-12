import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendar_id: z
        .string()
        .describe(
            'Calendar identifier. To retrieve calendar IDs call the calendarList.list method. If you want to access the primary calendar of the currently logged in user, use the "primary" keyword. Example: "primary" or "abc123xyz@group.calendar.google.com"'
        ),
    summary: z.string().optional().describe('Title of the calendar.'),
    description: z.string().optional().describe('Description of the calendar.'),
    location: z.string().optional().describe('Geographic location of the calendar as free-form text.'),
    time_zone: z.string().optional().describe('The time zone of the calendar. Formatted as an IANA Time Zone Database name, e.g. "Europe/Zurich".')
});

const OutputSchema = z.object({
    id: z.string(),
    summary: z.string(),
    description: z.union([z.string(), z.null()]),
    location: z.union([z.string(), z.null()]),
    time_zone: z.union([z.string(), z.null()]),
    kind: z.string(),
    etag: z.string(),
    data_owner: z.union([z.string(), z.null()]),
    auto_accept_invitations: z.union([z.boolean(), z.null()]),
    conference_properties: z.union([
        z.object({
            allowed_conference_solution_types: z.array(z.string())
        }),
        z.null()
    ])
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
            endpoint: `/calendar/v3/calendars/${input.calendar_id}`,
            data: {
                ...(input.summary && { summary: input.summary }),
                ...(input.description && { description: input.description }),
                ...(input.location && { location: input.location }),
                ...(input.time_zone && { timeZone: input.time_zone })
            },
            retries: 3
        });

        const data = response.data;

        return {
            id: data.id,
            summary: data.summary,
            description: data.description ?? null,
            location: data.location ?? null,
            time_zone: data.timeZone ?? null,
            kind: data.kind,
            etag: data.etag,
            data_owner: data.dataOwner ?? null,
            auto_accept_invitations: data.autoAcceptInvitations ?? null,
            conference_properties: data.conferenceProperties
                ? {
                      allowed_conference_solution_types: data.conferenceProperties.allowedConferenceSolutionTypes ?? []
                  }
                : null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
