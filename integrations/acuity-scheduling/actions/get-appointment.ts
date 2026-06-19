import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Appointment ID. Example: 1722092210'),
    pastFormAnswers: z.boolean().optional().describe('Include previous intake form answers.')
});

const LabelSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    color: z.string().optional()
});

const FormSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    values: z.array(z.record(z.string(), z.unknown())).optional()
});

const ProviderAppointmentSchema = z.object({
    id: z.number(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    endTime: z.string().optional(),
    datetime: z.string().optional(),
    datetimeCreated: z.string().optional(),
    dateCreated: z.string().optional(),
    price: z.string().optional(),
    paid: z.string().optional(),
    amountPaid: z.string().optional(),
    type: z.string().optional(),
    appointmentTypeID: z.number().optional(),
    calendar: z.string().optional(),
    calendarID: z.number().optional(),
    duration: z.string().optional(),
    timezone: z.string().optional(),
    notes: z.string().optional(),
    certificate: z.string().nullable().optional(),
    labels: z.array(LabelSchema).nullable().optional(),
    forms: z.array(FormSchema).nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    endTime: z.string().optional(),
    datetime: z.string().optional(),
    datetimeCreated: z.string().optional(),
    dateCreated: z.string().optional(),
    price: z.string().optional(),
    paid: z.string().optional(),
    amountPaid: z.string().optional(),
    type: z.string().optional(),
    appointmentTypeID: z.number().optional(),
    calendar: z.string().optional(),
    calendarID: z.number().optional(),
    duration: z.string().optional(),
    timezone: z.string().optional(),
    notes: z.string().optional(),
    certificate: z.string().optional(),
    labels: z.array(LabelSchema).optional(),
    forms: z.array(FormSchema).optional()
});

const action = createAction({
    description: 'Retrieve an appointment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.acuityscheduling.com/reference/get-appointments-id
        const response = await nango.get({
            endpoint: `/appointments/${encodeURIComponent(String(input.id))}`,
            params: {
                ...(input.pastFormAnswers !== undefined && { pastFormAnswers: String(input.pastFormAnswers) })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Appointment ${input.id} not found.`,
                id: input.id
            });
        }

        const appointment = ProviderAppointmentSchema.parse(response.data);

        return {
            id: appointment.id,
            ...(appointment.firstName !== undefined && { firstName: appointment.firstName }),
            ...(appointment.lastName !== undefined && { lastName: appointment.lastName }),
            ...(appointment.email !== undefined && { email: appointment.email }),
            ...(appointment.phone !== undefined && { phone: appointment.phone }),
            ...(appointment.date !== undefined && { date: appointment.date }),
            ...(appointment.time !== undefined && { time: appointment.time }),
            ...(appointment.endTime !== undefined && { endTime: appointment.endTime }),
            ...(appointment.datetime !== undefined && { datetime: appointment.datetime }),
            ...(appointment.datetimeCreated !== undefined && { datetimeCreated: appointment.datetimeCreated }),
            ...(appointment.dateCreated !== undefined && { dateCreated: appointment.dateCreated }),
            ...(appointment.price !== undefined && { price: appointment.price }),
            ...(appointment.paid !== undefined && { paid: appointment.paid }),
            ...(appointment.amountPaid !== undefined && { amountPaid: appointment.amountPaid }),
            ...(appointment.type !== undefined && { type: appointment.type }),
            ...(appointment.appointmentTypeID !== undefined && { appointmentTypeID: appointment.appointmentTypeID }),
            ...(appointment.calendar !== undefined && { calendar: appointment.calendar }),
            ...(appointment.calendarID !== undefined && { calendarID: appointment.calendarID }),
            ...(appointment.duration !== undefined && { duration: appointment.duration }),
            ...(appointment.timezone !== undefined && { timezone: appointment.timezone }),
            ...(appointment.notes !== undefined && { notes: appointment.notes }),
            ...(appointment.certificate !== undefined && appointment.certificate !== null && { certificate: appointment.certificate }),
            ...(appointment.labels !== undefined && appointment.labels !== null && { labels: appointment.labels }),
            ...(appointment.forms !== undefined && appointment.forms !== null && { forms: appointment.forms })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
