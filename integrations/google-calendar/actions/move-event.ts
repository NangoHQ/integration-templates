import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        calendar_id: z.string().describe('Calendar identifier of the source calendar where the event currently is. Example: "primary"'),
        event_id: z.string().describe('Event identifier. Example: "abc123def456"'),
        destination_calendar_id: z.string().describe('Calendar identifier of the target calendar where the event is to be moved to. Example: "primary"'),
        send_updates: z
            .enum(['all', 'externalOnly', 'none'])
            .optional()
            .describe("Guests who should receive notifications about the change of the event's organizer.")
    })
    .describe('Input parameters for moving a calendar event to another calendar.');

const ProviderEventSchema = z.object({
    id: z.string(),
    summary: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    htmlLink: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    start: z
        .object({
            dateTime: z.string().optional(),
            date: z.string().optional(),
            timeZone: z.string().optional()
        })
        .optional(),
    end: z
        .object({
            dateTime: z.string().optional(),
            date: z.string().optional(),
            timeZone: z.string().optional()
        })
        .optional(),
    organizer: z
        .object({
            email: z.string().optional(),
            displayName: z.string().optional(),
            self: z.boolean().optional()
        })
        .optional(),
    creator: z
        .object({
            email: z.string().optional(),
            displayName: z.string().optional(),
            self: z.boolean().optional()
        })
        .optional(),
    iCalUID: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Opaque identifier of the event.'),
        summary: z.string().optional().describe('Title of the event.'),
        description: z.string().optional().describe('Description of the event.'),
        status: z.string().optional().describe('Status of the event. Possible values are "confirmed", "tentative", or "cancelled".'),
        html_link: z.string().optional().describe('An absolute link to this event in the Google Calendar Web UI.'),
        created_at: z.string().optional().describe('Creation time of the event as an RFC3339 timestamp.'),
        updated_at: z.string().optional().describe('Last modification time of the event as an RFC3339 timestamp.'),
        start: z
            .object({
                date_time: z.string().optional().describe('The start time as a combined date-time value (formatted according to RFC3339).'),
                date: z.string().optional().describe('The date, in the format "yyyy-mm-dd", if this is an all-day event.'),
                time_zone: z
                    .string()
                    .optional()
                    .describe('The time zone in which the time is specified (formatted as an IANA Time Zone Database name, e.g. "Europe/Zurich").')
            })
            .optional()
            .describe('The start time of the event.'),
        end: z
            .object({
                date_time: z.string().optional().describe('The end time as a combined date-time value (formatted according to RFC3339).'),
                date: z.string().optional().describe('The date, in the format "yyyy-mm-dd", if this is an all-day event.'),
                time_zone: z
                    .string()
                    .optional()
                    .describe('The time zone in which the time is specified (formatted as an IANA Time Zone Database name, e.g. "Europe/Zurich").')
            })
            .optional()
            .describe('The (exclusive) end time of the event.'),
        organizer: z
            .object({
                email: z.string().optional().describe("The organizer's email address, if available."),
                display_name: z.string().optional().describe("The organizer's name, if available."),
                self: z.boolean().optional().describe('Whether the organizer corresponds to the calendar on which this copy of the event appears.')
            })
            .optional()
            .describe('The organizer of the event.'),
        creator: z
            .object({
                email: z.string().optional().describe("The creator's email address, if available."),
                display_name: z.string().optional().describe("The creator's name, if available."),
                self: z.boolean().optional().describe('Whether the creator corresponds to the calendar on which this copy of the event appears.')
            })
            .optional()
            .describe('The creator of the event.'),
        ical_uid: z.string().optional().describe('Event unique identifier as defined in RFC5545.')
    })
    .describe('The moved event as it appears on the destination calendar.');

/**
 * @tags: [read, write]
 * @tagReason: Mutates the event by moving it to a different calendar and changing its organizer, then reads the event from the destination calendar to return the confirmed copy.
 * @pitfalls: Only default events can be moved; birthday, focusTime, fromGmail, outOfOffice and workingLocation events cannot be moved. If the original organizer is not an attendee, a cancelled copy remains on the source calendar.
 */
const action = createAction({
    description: 'Move an event to another calendar, changing its organizer.',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/events/move
        await nango.post({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events/${encodeURIComponent(input.event_id)}/move`,
            params: {
                destination: input.destination_calendar_id,
                ...(input.send_updates !== undefined && { sendUpdates: input.send_updates })
            },
            retries: 1
        });

        // https://developers.google.com/workspace/calendar/api/v3/reference/events/get
        const getResponse = await nango.get({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.destination_calendar_id)}/events/${encodeURIComponent(input.event_id)}`,
            retries: 3
        });

        const providerEvent = ProviderEventSchema.parse(getResponse.data);

        return {
            id: providerEvent.id,
            ...(providerEvent.summary !== undefined && { summary: providerEvent.summary }),
            ...(providerEvent.description !== undefined && { description: providerEvent.description }),
            ...(providerEvent.status !== undefined && { status: providerEvent.status }),
            ...(providerEvent.htmlLink !== undefined && { html_link: providerEvent.htmlLink }),
            ...(providerEvent.created !== undefined && { created_at: providerEvent.created }),
            ...(providerEvent.updated !== undefined && { updated_at: providerEvent.updated }),
            ...(providerEvent.start !== undefined && {
                start: {
                    ...(providerEvent.start.dateTime !== undefined && { date_time: providerEvent.start.dateTime }),
                    ...(providerEvent.start.date !== undefined && { date: providerEvent.start.date }),
                    ...(providerEvent.start.timeZone !== undefined && { time_zone: providerEvent.start.timeZone })
                }
            }),
            ...(providerEvent.end !== undefined && {
                end: {
                    ...(providerEvent.end.dateTime !== undefined && { date_time: providerEvent.end.dateTime }),
                    ...(providerEvent.end.date !== undefined && { date: providerEvent.end.date }),
                    ...(providerEvent.end.timeZone !== undefined && { time_zone: providerEvent.end.timeZone })
                }
            }),
            ...(providerEvent.organizer !== undefined && {
                organizer: {
                    ...(providerEvent.organizer.email !== undefined && { email: providerEvent.organizer.email }),
                    ...(providerEvent.organizer.displayName !== undefined && { display_name: providerEvent.organizer.displayName }),
                    ...(providerEvent.organizer.self !== undefined && { self: providerEvent.organizer.self })
                }
            }),
            ...(providerEvent.creator !== undefined && {
                creator: {
                    ...(providerEvent.creator.email !== undefined && { email: providerEvent.creator.email }),
                    ...(providerEvent.creator.displayName !== undefined && { display_name: providerEvent.creator.displayName }),
                    ...(providerEvent.creator.self !== undefined && { self: providerEvent.creator.self })
                }
            }),
            ...(providerEvent.iCalUID !== undefined && { ical_uid: providerEvent.iCalUID })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
