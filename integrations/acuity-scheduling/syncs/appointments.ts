import { createSync } from 'nango';
import { z } from 'zod';

const ProviderLabelSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    color: z.string().optional()
});

const ProviderAppointmentSchema = z.object({
    id: z.number(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    datetime: z.string(),
    endTime: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    duration: z.string().optional(),
    timezone: z.string().optional(),
    price: z.string().optional(),
    paid: z.string().optional(),
    amountPaid: z.string().optional(),
    type: z.string().optional(),
    appointmentTypeID: z.number().optional(),
    calendarID: z.number().optional(),
    calendar: z.string().optional(),
    notes: z.string().optional(),
    location: z.string().optional(),
    cancelNote: z.string().optional(),
    isVideo: z.boolean().optional(),
    labels: z.array(ProviderLabelSchema).nullable().optional(),
    forms: z.array(z.unknown()).optional(),
    addonIDs: z.array(z.number()).optional(),
    category: z.string().optional()
});

const AppointmentSchema = z.object({
    id: z.string().describe('The appointment ID as a stable string'),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    datetime: z.string().describe('ISO 8601 datetime with explicit offset'),
    endTime: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    duration: z.string().optional(),
    timezone: z.string().optional(),
    price: z.string().optional(),
    paid: z.string().optional(),
    amountPaid: z.string().optional(),
    type: z.string().optional(),
    appointmentTypeID: z.number().optional(),
    calendarID: z.number().optional(),
    calendar: z.string().optional(),
    notes: z.string().optional(),
    location: z.string().optional(),
    cancelNote: z.string().optional(),
    isVideo: z.boolean().optional(),
    labels: z.array(ProviderLabelSchema).optional(),
    forms: z.array(z.unknown()).optional(),
    addonIDs: z.array(z.number()).optional(),
    category: z.string().optional()
});

const CheckpointSchema = z.object({
    next_date: z.string(),
    end_date: z.string()
});

const APPOINTMENTS_PER_REQUEST = 100;
const LOOKBACK_DAYS = 30;
const LOOKAHEAD_DAYS = 90;

const formatDate = (date: Date): string => date.toISOString().slice(0, 10);

const addDays = (dateString: string, days: number): string => {
    const date = new Date(`${dateString}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return formatDate(date);
};

const sync = createSync({
    description: 'Sync appointments.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Appointment: AppointmentSchema
    },
    endpoints: [
        {
            path: '/syncs/appointments',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const now = new Date();
        const defaultStartDate = formatDate(new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000));
        const defaultEndDate = formatDate(new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000));
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());

        // Acuity exposes a max page size plus date filters, but no offset/cursor.
        // Walk the rolling window one day at a time so interrupted runs can resume safely.
        let nextDate = checkpoint.success ? checkpoint.data.next_date : defaultStartDate;
        const endDate = checkpoint.success ? checkpoint.data.end_date : defaultEndDate;

        while (nextDate <= endDate) {
            // https://developers.acuityscheduling.com/reference/get-appointments
            const response = await nango.get({
                endpoint: '/appointments',
                params: {
                    minDate: nextDate,
                    maxDate: nextDate,
                    direction: 'ASC',
                    showall: 'true',
                    max: APPOINTMENTS_PER_REQUEST
                },
                retries: 3
            });

            const rawData = response.data;
            if (!Array.isArray(rawData)) {
                throw new Error('Appointments response is not an array');
            }

            const appointments = rawData.map((record) => {
                const parsed = ProviderAppointmentSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse appointment: ${parsed.error.message}`);
                }
                const raw = parsed.data;
                return {
                    id: String(raw.id),
                    ...(raw.firstName !== undefined && { firstName: raw.firstName }),
                    ...(raw.lastName !== undefined && { lastName: raw.lastName }),
                    ...(raw.email !== undefined && { email: raw.email }),
                    ...(raw.phone !== undefined && { phone: raw.phone }),
                    ...(raw.datetime !== undefined && { datetime: raw.datetime }),
                    ...(raw.endTime !== undefined && { endTime: raw.endTime }),
                    ...(raw.date !== undefined && { date: raw.date }),
                    ...(raw.time !== undefined && { time: raw.time }),
                    ...(raw.duration !== undefined && { duration: raw.duration }),
                    ...(raw.timezone !== undefined && { timezone: raw.timezone }),
                    ...(raw.price !== undefined && { price: raw.price }),
                    ...(raw.paid !== undefined && { paid: raw.paid }),
                    ...(raw.amountPaid !== undefined && { amountPaid: raw.amountPaid }),
                    ...(raw.type !== undefined && { type: raw.type }),
                    ...(raw.appointmentTypeID !== undefined && { appointmentTypeID: raw.appointmentTypeID }),
                    ...(raw.calendarID !== undefined && { calendarID: raw.calendarID }),
                    ...(raw.calendar !== undefined && { calendar: raw.calendar }),
                    ...(raw.notes !== undefined && { notes: raw.notes }),
                    ...(raw.location !== undefined && { location: raw.location }),
                    ...(raw.cancelNote !== undefined && { cancelNote: raw.cancelNote }),
                    ...(raw.isVideo !== undefined && { isVideo: raw.isVideo }),
                    ...(raw.labels !== null && raw.labels !== undefined && { labels: raw.labels }),
                    ...(raw.forms !== undefined && { forms: raw.forms }),
                    ...(raw.addonIDs !== undefined && { addonIDs: raw.addonIDs }),
                    ...(raw.category !== undefined && { category: raw.category })
                };
            });

            if (appointments.length === APPOINTMENTS_PER_REQUEST) {
                throw new Error(`Appointments on ${nextDate} hit the ${APPOINTMENTS_PER_REQUEST}-record limit and may be truncated`);
            }

            if (appointments.length > 0) {
                await nango.batchSave(appointments, 'Appointment');
            }

            nextDate = addDays(nextDate, 1);

            if (nextDate <= endDate) {
                await nango.saveCheckpoint({ next_date: nextDate, end_date: endDate });
            }
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
