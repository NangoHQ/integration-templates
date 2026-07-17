import { createSync } from 'nango';
import { z } from 'zod';

const ConnectionConfigSchema = z.object({
    locationId: z.string()
});

const CalendarSchema = z
    .object({
        id: z.string(),
        locationId: z.string().optional(),
        groupId: z.string().optional(),
        name: z.string().optional(),
        widgetSlug: z.string().optional(),
        calendarType: z.string().optional(),
        widgetType: z.string().optional(),
        eventTitle: z.string().optional(),
        eventColor: z.string().optional(),
        slotDuration: z.number().optional(),
        slotDurationUnit: z.string().optional(),
        slotInterval: z.number().optional(),
        slotIntervalUnit: z.string().optional(),
        slotBuffer: z.number().optional(),
        slotBufferUnit: z.string().optional(),
        preBuffer: z.number().optional(),
        preBufferUnit: z.string().optional(),
        appoinmentPerSlot: z.number().optional(),
        appointmentPerDay: z.number().optional(),
        allowBookingAfter: z.number().optional(),
        allowBookingAfterUnit: z.string().optional(),
        allowBookingFor: z.number().optional(),
        allowBookingForUnit: z.string().optional(),
        openHours: z.unknown().optional(),
        enableRecurring: z.boolean().optional(),
        autoConfirm: z.boolean().optional(),
        googleInvitationEmails: z.boolean().optional(),
        allowReschedule: z.boolean().optional(),
        allowCancellation: z.boolean().optional(),
        formSubmitType: z.string().optional(),
        formSubmitThanksMessage: z.string().optional(),
        availabilities: z.array(z.unknown()).optional(),
        consentLabel: z.string().optional(),
        isActive: z.boolean().optional()
    })
    .passthrough();

const CalendarsResponseSchema = z.object({
    calendars: z.array(CalendarSchema)
});

const sync = createSync({
    description: 'Sync calendars from HighLevel.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Calendar: CalendarSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();

        const configParse = ConnectionConfigSchema.safeParse(connection.connection_config);
        if (!configParse.success) {
            throw new Error('Missing locationId in connection configuration');
        }

        const locationId = configParse.data.locationId;

        await nango.trackDeletesStart('Calendar');

        // https://github.com/GoHighLevel/highlevel-api-docs/blob/main/apps/calendars.json
        const response = await nango.get({
            endpoint: '/calendars/',
            params: {
                locationId
            },
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const parseResult = CalendarsResponseSchema.safeParse(response.data);
        if (!parseResult.success) {
            throw new Error(`Invalid response from GET /calendars/: ${parseResult.error.message}`);
        }

        const calendars = parseResult.data.calendars;

        if (calendars.length > 0) {
            await nango.batchSave(calendars, 'Calendar');
        }

        await nango.trackDeletesEnd('Calendar');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
