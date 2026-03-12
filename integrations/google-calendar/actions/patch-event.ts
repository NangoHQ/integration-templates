import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    event_id: z.string().describe('Event ID to patch. Example: "abc123def456"'),
    calendar_id: z.string().optional().describe('Calendar ID (defaults to "primary"). Example: "primary" or "user@example.com"'),
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
    summary: z.union([z.string(), z.null()]).describe('Event title/summary'),
    description: z.union([z.string(), z.null()]).describe('Event description'),
    location: z.union([z.string(), z.null()]).describe('Event location'),
    start: z
        .object({
            dateTime: z.union([z.string(), z.null()]),
            date: z.union([z.string(), z.null()]),
            timeZone: z.union([z.string(), z.null()])
        })
        .optional(),
    end: z
        .object({
            dateTime: z.union([z.string(), z.null()]),
            date: z.union([z.string(), z.null()]),
            timeZone: z.union([z.string(), z.null()])
        })
        .optional(),
    htmlLink: z.union([z.string(), z.null()]).describe('Link to the event in Google Calendar'),
    created: z.union([z.string(), z.null()]).describe('Event creation timestamp'),
    updated: z.union([z.string(), z.null()]).describe('Last update timestamp'),
    status: z.union([z.string(), z.null()]).describe('Event status (confirmed, tentative, cancelled)')
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
        const calendarId = input.calendar_id || 'primary';

        // Build the patch payload with only provided fields
        const patchData: Record<string, unknown> = {};
        if (input.summary !== undefined) patchData['summary'] = input.summary;
        if (input.description !== undefined) patchData['description'] = input.description;
        if (input.location !== undefined) patchData['location'] = input.location;
        if (input.start !== undefined) patchData['start'] = input.start;
        if (input.end !== undefined) patchData['end'] = input.end;

        // https://developers.google.com/workspace/calendar/api/v3/reference/events/patch
        const response = await nango.patch({
            endpoint: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(input.event_id)}`,
            data: patchData,
            retries: 3
        });

        const data = response.data as Record<string, unknown>;

        return {
            id: String(data['id'] || ''),
            summary: data['summary'] ? String(data['summary']) : null,
            description: data['description'] ? String(data['description']) : null,
            location: data['location'] ? String(data['location']) : null,
            start: data['start']
                ? {
                      dateTime: (data['start'] as Record<string, unknown>)['dateTime'] ? String((data['start'] as Record<string, unknown>)['dateTime']) : null,
                      date: (data['start'] as Record<string, unknown>)['date'] ? String((data['start'] as Record<string, unknown>)['date']) : null,
                      timeZone: (data['start'] as Record<string, unknown>)['timeZone'] ? String((data['start'] as Record<string, unknown>)['timeZone']) : null
                  }
                : undefined,
            end: data['end']
                ? {
                      dateTime: (data['end'] as Record<string, unknown>)['dateTime'] ? String((data['end'] as Record<string, unknown>)['dateTime']) : null,
                      date: (data['end'] as Record<string, unknown>)['date'] ? String((data['end'] as Record<string, unknown>)['date']) : null,
                      timeZone: (data['end'] as Record<string, unknown>)['timeZone'] ? String((data['end'] as Record<string, unknown>)['timeZone']) : null
                  }
                : undefined,
            htmlLink: data['htmlLink'] ? String(data['htmlLink']) : null,
            created: data['created'] ? String(data['created']) : null,
            updated: data['updated'] ? String(data['updated']) : null,
            status: data['status'] ? String(data['status']) : null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
