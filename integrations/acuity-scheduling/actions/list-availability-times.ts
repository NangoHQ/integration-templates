import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    date: z.string().describe('Date to check availability for. Example: "2026-06-15"'),
    appointmentTypeID: z.number().describe('Appointment type ID to check availability for. Example: 94517100'),
    calendarID: z.number().optional().describe('Calendar ID to filter availability by. Example: 14209019'),
    addonIDs: z.array(z.number()).optional().describe('Array of addon IDs to include in availability check.'),
    timezone: z.string().optional().describe('Timezone to use for the returned times. Example: "Indian/Mayotte"'),
    ignoreAppointmentIDs: z.array(z.number()).optional().describe('Array of appointment IDs to ignore when checking availability (useful for rescheduling).')
});

const OutputSchema = z.object({
    times: z.array(z.string()),
    calendarID: z.number().optional()
});

const action = createAction({
    description: 'List available times for a date and appointment type.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-availability-times',
        group: 'Availability'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            date: input.date,
            appointmentTypeID: input.appointmentTypeID
        };

        if (input.calendarID !== undefined) {
            params['calendarID'] = input.calendarID;
        }

        if (input.addonIDs !== undefined && input.addonIDs.length > 0) {
            for (let i = 0; i < input.addonIDs.length; i++) {
                const addonID = input.addonIDs[i];
                if (addonID !== undefined) {
                    params[`addonIDs[${i}]`] = addonID;
                }
            }
        }

        if (input.timezone !== undefined) {
            params['timezone'] = input.timezone;
        }

        if (input.ignoreAppointmentIDs !== undefined && input.ignoreAppointmentIDs.length > 0) {
            for (let i = 0; i < input.ignoreAppointmentIDs.length; i++) {
                const appointmentID = input.ignoreAppointmentIDs[i];
                if (appointmentID !== undefined) {
                    params[`ignoreAppointmentIDs[${i}]`] = appointmentID;
                }
            }
        }

        // https://developers.acuityscheduling.com/reference/get-availability-times
        const response = await nango.get({
            endpoint: '/availability/times',
            params,
            retries: 3
        });

        const rawData = response.data;
        if (!Array.isArray(rawData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of available times from the provider.'
            });
        }

        const times: string[] = [];
        for (const item of rawData) {
            if (typeof item === 'string') {
                times.push(item);
            } else if (typeof item === 'object' && item !== null && 'time' in item && typeof item.time === 'string') {
                times.push(item.time);
            }
        }

        return {
            times,
            ...(input.calendarID !== undefined && { calendarID: input.calendarID })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
