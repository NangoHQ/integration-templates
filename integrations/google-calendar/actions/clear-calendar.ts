import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    // No input required - clears the primary calendar
});

const OutputSchema = z.object({
    deleted_count: z.number().describe('Number of events deleted'),
    calendar_id: z.string().describe('The calendar ID that was cleared')
});

const action = createAction({
    description: 'Clear the primary calendar by deleting all events',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/clear-calendar',
        group: 'Calendars'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const calendarId = 'primary';

        // https://developers.google.com/calendar/api/v3/reference/events/list
        const listResponse = await nango.get({
            endpoint: `calendar/v3/calendars/${calendarId}/events`,
            params: {
                maxResults: '2500'
                // Note: Not using singleEvents=true to avoid expanding recurring events
                // Deleting parent recurring events removes all instances
            },
            retries: 3
        });

        const events = listResponse.data.items || [];

        if (events.length === 0) {
            return {
                deleted_count: 0,
                calendar_id: calendarId
            };
        }

        // Delete events in parallel batches for efficiency
        const batchSize = 10;
        let deletedCount = 0;

        for (let i = 0; i < events.length; i += batchSize) {
            const batch = events.slice(i, i + batchSize);
            const deletePromises = batch
                .filter((event: { id?: string }) => event.id)
                .map((event: { id: string }) =>
                    // https://developers.google.com/calendar/api/v3/reference/events/delete
                    nango
                        .delete({
                            endpoint: `calendar/v3/calendars/${calendarId}/events/${event.id}`,
                            retries: 1
                        })
                        .then(() => {
                            deletedCount++;
                        })
                        .catch(() => {
                            // Continue even if one delete fails
                        })
                );

            await Promise.all(deletePromises);
        }

        return {
            deleted_count: deletedCount,
            calendar_id: calendarId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
