import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Appointment ID. Example: 1722114448'),
    datetime: z.string().describe('New datetime for the appointment. Example: "2026-06-25T15:00:00+0300"'),
    calendarID: z.number().nullable().optional().describe('Calendar ID. Omit or pass null for auto-select.'),
    timezone: z.string().optional().describe('Timezone for the appointment.')
});

const ProviderAppointmentSchema = z
    .object({
        id: z.number()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.number()
    })
    .passthrough();

const action = createAction({
    description: 'Reschedule an appointment.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/reschedule-appointment',
        group: 'Appointments'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            datetime: input.datetime
        };

        if (input['calendarID'] !== undefined) {
            body['calendarID'] = input['calendarID'];
        }

        if (input['timezone'] !== undefined) {
            body['timezone'] = input['timezone'];
        }

        // https://developers.acuityscheduling.com/reference/put-appointments-id-reschedule
        const response = await nango.put({
            endpoint: `/appointments/${encodeURIComponent(input.id)}/reschedule`,
            data: body,
            retries: 3
        });

        const providerAppointment = ProviderAppointmentSchema.parse(response.data);

        return providerAppointment;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
