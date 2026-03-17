import { z } from 'zod';
import { createAction } from 'nango';

const EventTimeSchema = z.object({
    dateTime: z.string().nullish(),
    date: z.string().nullish(),
    timeZone: z.string().nullish()
});

const InputSchema = z.object({
    eventId: z.string().describe('Event ID to patch. Example: "abc123def456"'),
    calendarId: z.string().optional().describe('Calendar ID (defaults to "primary"). Example: "primary" or "user@example.com"'),
    summary: z.string().optional().describe('Event title/summary'),
    description: z.string().optional().describe('Event description'),
    location: z.string().optional().describe('Event location'),
    start: z
        .object({
            dateTime: z.string().optional().describe('Start time in RFC3339 format. Example: "2024-12-01T10:00:00-05:00"'),
            date: z.string().optional().describe('Start date (for all-day events). Example: "2024-12-01"'),
            timeZone: z.string().optional().describe('Time zone for the start time. Example: "America/New_York"')
        })
        .optional()
        .describe('Event start time'),
    end: z
        .object({
            dateTime: z.string().optional().describe('End time in RFC3339 format. Example: "2024-12-01T11:00:00-05:00"'),
            date: z.string().optional().describe('End date (for all-day events). Example: "2024-12-01"'),
            timeZone: z.string().optional().describe('Time zone for the end time. Example: "America/New_York"')
        })
        .optional()
        .describe('Event end time')
});

const OutputSchema = z.object({
    id: z.string().describe('Event ID'),
    summary: z.string().optional().describe('Event title/summary'),
    description: z.string().optional().describe('Event description'),
    location: z.string().optional().describe('Event location'),
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
    htmlLink: z.string().optional().describe('Link to the event in Google Calendar'),
    created: z.string().optional().describe('Event creation timestamp'),
    updated: z.string().optional().describe('Last update timestamp'),
    status: z.string().optional().describe('Event status (confirmed, tentative, cancelled)')
});

const PatchEventResponseSchema = z.object({
    id: z.string(),
    summary: z.string().nullish(),
    description: z.string().nullish(),
    location: z.string().nullish(),
    start: EventTimeSchema.nullish(),
    end: EventTimeSchema.nullish(),
    htmlLink: z.string().nullish(),
    created: z.string().nullish(),
    updated: z.string().nullish(),
    status: z.string().nullish()
});

const action = createAction({
    description: 'Partially update only provided event fields like time, location, or description',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/patch-event',
        group: 'Events'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const calendarId = input.calendarId || 'primary';

        // Build the patch payload with only provided fields
        const patchData: Record<string, unknown> = {};
        if (input.summary !== undefined) patchData['summary'] = input.summary;
        if (input.description !== undefined) patchData['description'] = input.description;
        if (input.location !== undefined) patchData['location'] = input.location;
        if (input.start !== undefined) patchData['start'] = input.start;
        if (input.end !== undefined) patchData['end'] = input.end;

        // https://developers.google.com/workspace/calendar/api/v3/reference/events/patch
        const response = await nango.patch({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(input.eventId)}`,
            data: patchData,
            retries: 3
        });

        const data = PatchEventResponseSchema.parse(response.data);

        return {
            id: data.id,
            summary: data.summary ?? undefined,
            description: data.description ?? undefined,
            location: data.location ?? undefined,
            start: data.start
                ? {
                      dateTime: data.start.dateTime ?? undefined,
                      date: data.start.date ?? undefined,
                      timeZone: data.start.timeZone ?? undefined
                  }
                : undefined,
            end: data.end
                ? {
                      dateTime: data.end.dateTime ?? undefined,
                      date: data.end.date ?? undefined,
                      timeZone: data.end.timeZone ?? undefined
                  }
                : undefined,
            htmlLink: data.htmlLink ?? undefined,
            created: data.created ?? undefined,
            updated: data.updated ?? undefined,
            status: data.status ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
