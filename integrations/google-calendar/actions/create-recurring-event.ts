import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        calendarId: z.string().describe('Calendar identifier. Use "primary" for the authenticated user\'s primary calendar. Example: "primary"'),
        summary: z.string().describe('Title of the event. Example: "Weekly Team Sync"'),
        startDateTime: z.string().describe('Start time of the event in RFC 3339 format. Example: "2026-08-12T10:00:00-07:00"'),
        endDateTime: z.string().describe('End time of the event in RFC 3339 format. Example: "2026-08-12T11:00:00-07:00"'),
        timeZone: z.string().optional().describe('Time zone for the event start and end times. Example: "America/Los_Angeles". Defaults to UTC if omitted.'),
        rrule: z.string().describe('Recurrence rule in iCalendar RRULE format. Example: "FREQ=WEEKLY;BYDAY=MO,WE,FR"')
    })
    .describe('Input to create a recurring Google Calendar event');

const ProviderDateTimeSchema = z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
    timeZone: z.string().optional()
});

const ProviderEventSchema = z.object({
    id: z.string().optional(),
    summary: z.string().optional(),
    start: ProviderDateTimeSchema.optional(),
    end: ProviderDateTimeSchema.optional(),
    recurrence: z.array(z.string()).optional(),
    htmlLink: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    status: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the created event. Example: "abc123def456"'),
        summary: z.string().optional().describe('Title of the created event.'),
        start: z
            .object({
                dateTime: z.string().optional().describe('Start time in RFC 3339 format.'),
                timeZone: z.string().optional().describe('Time zone of the start time.')
            })
            .optional()
            .describe('Start time of the event.'),
        end: z
            .object({
                dateTime: z.string().optional().describe('End time in RFC 3339 format.'),
                timeZone: z.string().optional().describe('Time zone of the end time.')
            })
            .optional()
            .describe('End time of the event.'),
        recurrence: z.array(z.string()).optional().describe('List of recurrence rules applied to the event. Example: ["RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"]'),
        htmlLink: z.string().optional().describe('URL to view the event in Google Calendar.'),
        status: z.string().optional().describe('Status of the event such as confirmed or tentative.')
    })
    .describe('The created recurring Google Calendar event');

/**
 * @tags: [write]
 * @tagReason: Inserts a new recurring event into the specified Google Calendar.
 * @pitfalls: The supplied rrule value must not include the "RRULE:" prefix because the action adds it automatically.
 */
const action = createAction({
    description: 'Create a recurring event with supplied start, end, and RRULE values',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events`,
            data: {
                summary: input.summary,
                start: {
                    dateTime: input.startDateTime,
                    timeZone: input.timeZone || 'UTC'
                },
                end: {
                    dateTime: input.endDateTime,
                    timeZone: input.timeZone || 'UTC'
                },
                recurrence: [`RRULE:${input.rrule}`]
            },
            retries: 1
        });

        const providerEvent = ProviderEventSchema.parse(response.data);

        if (!providerEvent.id) {
            throw new nango.ActionError({
                type: 'missing_id',
                message: 'Created event response did not contain an id.'
            });
        }

        return {
            id: providerEvent.id,
            ...(providerEvent.summary != null && { summary: providerEvent.summary }),
            ...(providerEvent.start != null && {
                start: {
                    ...(providerEvent.start.dateTime != null && { dateTime: providerEvent.start.dateTime }),
                    ...(providerEvent.start.timeZone != null && { timeZone: providerEvent.start.timeZone })
                }
            }),
            ...(providerEvent.end != null && {
                end: {
                    ...(providerEvent.end.dateTime != null && { dateTime: providerEvent.end.dateTime }),
                    ...(providerEvent.end.timeZone != null && { timeZone: providerEvent.end.timeZone })
                }
            }),
            ...(providerEvent.recurrence != null && { recurrence: providerEvent.recurrence }),
            ...(providerEvent.htmlLink != null && { htmlLink: providerEvent.htmlLink }),
            ...(providerEvent.status != null && { status: providerEvent.status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
