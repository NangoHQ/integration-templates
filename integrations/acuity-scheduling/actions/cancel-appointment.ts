import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Appointment ID. Example: 1722092210'),
    cancelNote: z.string().optional().describe('A message to send with cancellation notifications.'),
    noShow: z.boolean().optional().describe('Whether the appointment was a no show, settable by admins.')
});

const FormValueSchema = z.object({
    value: z.string().optional(),
    name: z.string().optional(),
    fieldID: z.number().optional(),
    id: z.number().optional()
});

const FormSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    values: z.array(FormValueSchema).optional()
});

const OutputSchema = z.object({
    id: z.number().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    endTime: z.string().optional(),
    dateCreated: z.string().optional(),
    datetime: z.string().optional(),
    price: z.string().optional(),
    paid: z.string().optional(),
    amountPaid: z.string().optional(),
    type: z.string().optional(),
    appointmentTypeID: z.number().optional(),
    classID: z.number().nullable().optional(),
    duration: z.string().optional(),
    calendar: z.string().optional(),
    calendarID: z.number().optional(),
    location: z.string().optional(),
    certificate: z.string().nullable().optional(),
    confirmationPage: z.string().optional(),
    formsText: z.string().optional(),
    notes: z.string().optional(),
    timezone: z.string().optional(),
    forms: z.array(FormSchema).optional(),
    noShow: z.boolean().optional()
});

const action = createAction({
    description: 'Cancel an appointment.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/cancel-appointment',
        group: 'Appointments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};
        if (input.cancelNote !== undefined) {
            data['cancelNote'] = input.cancelNote;
        }
        if (input.noShow !== undefined) {
            data['noShow'] = input.noShow;
        }

        const response = await nango.put({
            // https://developers.acuityscheduling.com/reference/put-appointments-id-cancel
            endpoint: `/appointments/${encodeURIComponent(input.id)}/cancel`,
            data,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
