import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        calendarId: z.string().optional().describe('Calendar identifier. Use "primary" for the user\'s primary calendar.'),
        summary: z.string().optional().describe('Title of the event.'),
        startDate: z.string().describe('Start date of the all-day event in yyyy-mm-dd format (inclusive).'),
        endDate: z.string().describe('End date of the all-day event in yyyy-mm-dd format (exclusive).'),
        description: z.string().optional().describe('Description of the event.'),
        location: z.string().optional().describe('Geographic location of the event as free-form text.')
    })
    .describe('Input to create an all-day calendar event.');

const ProviderEventSchema = z.object({
    id: z.string(),
    summary: z.string().optional().nullable(),
    start: z.object({
        date: z.string().optional(),
        dateTime: z.string().optional(),
        timeZone: z.string().optional()
    }),
    end: z.object({
        date: z.string().optional(),
        dateTime: z.string().optional(),
        timeZone: z.string().optional()
    }),
    htmlLink: z.string().optional().nullable(),
    status: z.string().optional().nullable()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Opaque identifier of the created event.'),
        summary: z.string().optional().describe('Title of the event.'),
        startDate: z.string().optional().describe('Start date of the all-day event in yyyy-mm-dd format.'),
        endDate: z.string().optional().describe('End date of the all-day event in yyyy-mm-dd format.'),
        htmlLink: z.string().optional().describe('URL to view the event in Google Calendar.'),
        status: z.string().optional().describe('Status of the event, e.g. "confirmed".')
    })
    .describe('Created all-day calendar event.');

/**
 * @tags: [write]
 * @tagReason: Creates a new calendar event on the provider.
 * @pitfalls: The end date is exclusive; a one-day event on 2024-01-01 must use endDate 2024-01-02.
 */
const action = createAction({
    description: 'Create an all-day calendar event using start and end dates',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const calendarId = input.calendarId || 'primary';

        const response = await nango.post({
            // https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
            data: {
                summary: input.summary,
                start: {
                    date: input.startDate
                },
                end: {
                    date: input.endDate
                },
                description: input.description,
                location: input.location
            },
            retries: 3
        });

        const providerEvent = ProviderEventSchema.parse(response.data);

        return {
            id: providerEvent.id,
            ...(providerEvent.summary != null && { summary: providerEvent.summary }),
            ...(providerEvent.start.date != null && { startDate: providerEvent.start.date }),
            ...(providerEvent.end.date != null && { endDate: providerEvent.end.date }),
            ...(providerEvent.htmlLink != null && { htmlLink: providerEvent.htmlLink }),
            ...(providerEvent.status != null && { status: providerEvent.status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
