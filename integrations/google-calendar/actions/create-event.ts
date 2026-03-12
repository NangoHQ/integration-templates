import { z } from 'zod';
import { createAction } from 'nango';

// Attendee schema for Google Calendar
const AttendeeSchema = z.object({
    email: z.string().email().describe('Email address of the attendee. Example: "attendee@example.com"'),
    displayName: z.string().optional().describe('Display name of the attendee'),
    responseStatus: z.enum(['needsAction', 'declined', 'tentative', 'accepted']).optional().describe('Response status')
});

// Reminder override schema
const ReminderOverrideSchema = z.object({
    method: z.enum(['email', 'popup']).describe('Method of reminder'),
    minutes: z.number().describe('Minutes before the event to trigger the reminder')
});

// Input schema for creating a calendar event
const InputSchema = z.object({
    calendar_id: z.string().describe('Calendar ID to create the event in. Example: "primary" or a calendar ID string'),
    summary: z.string().describe('Event title/summary. Example: "Team Meeting"'),
    description: z.string().optional().describe('Event description'),
    location: z.string().optional().describe('Event location'),
    start: z.object({
        dateTime: z.string().describe('Start time in ISO 8601 format. Example: "2024-03-15T09:00:00-07:00"'),
        timeZone: z.string().optional().describe('Time zone for the start time. Example: "America/Los_Angeles"')
    }),
    end: z.object({
        dateTime: z.string().describe('End time in ISO 8601 format. Example: "2024-03-15T10:00:00-07:00"'),
        timeZone: z.string().optional().describe('Time zone for the end time. Example: "America/Los_Angeles"')
    }),
    attendees: z.array(AttendeeSchema).optional().describe('List of attendees'),
    reminders: z
        .object({
            useDefault: z.boolean().optional().describe('Whether to use default reminders'),
            overrides: z.array(ReminderOverrideSchema).optional().describe('Custom reminder overrides')
        })
        .optional()
        .describe('Event reminders'),
    recurrence: z.array(z.string()).optional().describe('Recurrence rules (RRULE, EXRULE, RDATE, EXDATE). Example: ["RRULE:FREQ=WEEKLY;BYDAY=MO"]')
});

// Output schema for created event
const OutputSchema = z.object({
    id: z.string().describe('Event ID'),
    htmlLink: z.string().describe('Link to the event in Google Calendar'),
    summary: z.string().describe('Event title/summary'),
    description: z.union([z.string(), z.null()]).describe('Event description'),
    location: z.union([z.string(), z.null()]).describe('Event location'),
    start: z.object({
        dateTime: z.string(),
        timeZone: z.union([z.string(), z.null()])
    }),
    end: z.object({
        dateTime: z.string(),
        timeZone: z.union([z.string(), z.null()])
    }),
    attendees: z
        .array(
            z.object({
                email: z.string(),
                displayName: z.union([z.string(), z.null()]),
                responseStatus: z.string()
            })
        )
        .optional(),
    created: z.string().describe('Creation timestamp'),
    updated: z.string().describe('Last update timestamp')
});

const action = createAction({
    description: 'Create a calendar event',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-event',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/calendar/api/v3/reference/events/insert
        const response = await nango.post({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(input.calendar_id)}/events`,
            data: {
                summary: input.summary,
                description: input.description,
                location: input.location,
                start: input.start,
                end: input.end,
                attendees: input.attendees,
                reminders: input.reminders,
                recurrence: input.recurrence
            },
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create calendar event',
                calendar_id: input.calendar_id
            });
        }

        const event = response.data;

        return {
            id: event.id,
            htmlLink: event.htmlLink,
            summary: event.summary,
            description: event.description ?? null,
            location: event.location ?? null,
            start: {
                dateTime: event.start?.dateTime,
                timeZone: event.start?.timeZone ?? null
            },
            end: {
                dateTime: event.end?.dateTime,
                timeZone: event.end?.timeZone ?? null
            },
            attendees: event.attendees?.map((attendee: any) => ({
                email: attendee.email,
                displayName: attendee.displayName ?? null,
                responseStatus: attendee.responseStatus
            })),
            created: event.created,
            updated: event.updated
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
