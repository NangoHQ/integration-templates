import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        calendarId: z
            .string()
            .describe(
                'Calendar identifier. To retrieve calendar IDs call the calendarList.list method. If you want to access the primary calendar of the currently logged in user, use the "primary" keyword.'
            ),
        summary: z.string().optional().describe('Title of the calendar.'),
        description: z.string().nullable().optional().describe('Description of the calendar. Specifying null clears the existing description.'),
        location: z
            .string()
            .nullable()
            .optional()
            .describe('Geographic location of the calendar as free-form text. Specifying null clears the existing location.'),
        timeZone: z
            .string()
            .nullable()
            .optional()
            .describe(
                'The time zone of the calendar. (Formatted as an IANA Time Zone database name, e.g. "Europe/Zurich".) Specifying null clears the existing time zone.'
            )
    })
    .describe("Input to update a calendar's metadata");

const ProviderCalendarSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    id: z.string(),
    summary: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    timeZone: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Identifier of the calendar.'),
        summary: z.string().optional().describe('Title of the calendar.'),
        description: z.string().optional().describe('Description of the calendar.'),
        location: z.string().optional().describe('Geographic location of the calendar.'),
        timeZone: z.string().optional().describe('The time zone of the calendar.')
    })
    .describe('Updated calendar metadata');

/**
 * @tags: [write]
 * @tagReason: Mutates calendar metadata on the Google Calendar provider.
 * @pitfalls: This updates only the core calendar resource and does not affect calendarList settings such as color, visibility, or notifications.
 */
const action = createAction({
    description: "Update a calendar's metadata",
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/calendars/patch
        const response = await nango.patch({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}`,
            data: {
                ...(input.summary !== undefined && { summary: input.summary }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.location !== undefined && { location: input.location }),
                ...(input.timeZone !== undefined && { timeZone: input.timeZone })
            },
            retries: 3
        });

        const providerCalendar = ProviderCalendarSchema.parse(response.data);

        return {
            id: providerCalendar.id,
            ...(providerCalendar.summary !== undefined && { summary: providerCalendar.summary }),
            ...(providerCalendar.description !== undefined && { description: providerCalendar.description }),
            ...(providerCalendar.location !== undefined && { location: providerCalendar.location }),
            ...(providerCalendar.timeZone !== undefined && { timeZone: providerCalendar.timeZone })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
