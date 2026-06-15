import { createSync } from 'nango';
import { z } from 'zod';

const CalendarSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    replyTo: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    timezone: z.string().optional()
});

const ProviderCalendarSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    email: z.string().optional(),
    replyTo: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    timezone: z.string().optional()
});

const sync = createSync({
    description: 'Sync calendars.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/calendars' }],
    models: {
        Calendar: CalendarSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('Calendar');

        // https://developers.acuityscheduling.com/reference/get-calendars
        const response = await nango.get({
            endpoint: '/calendars',
            retries: 3
        });

        const parsedCalendars = z.array(ProviderCalendarSchema).safeParse(response.data);
        if (!parsedCalendars.success) {
            throw new Error('Failed to parse calendars response: ' + parsedCalendars.error.message);
        }

        const records = parsedCalendars.data.map((record) => ({
            id: String(record.id),
            ...(record.name != null && { name: record.name }),
            ...(record.email != null && { email: record.email }),
            ...(record.replyTo != null && { replyTo: record.replyTo }),
            ...(record.description != null && { description: record.description }),
            ...(record.location != null && { location: record.location }),
            ...(record.timezone != null && { timezone: record.timezone })
        }));

        if (records.length > 0) {
            await nango.batchSave(records, 'Calendar');
        }

        await nango.trackDeletesEnd('Calendar');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
