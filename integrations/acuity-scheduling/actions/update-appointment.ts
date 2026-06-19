import { z } from 'zod';
import { createAction } from 'nango';

const ProviderLabelSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    color: z.string().optional()
});

const ProviderFormValueSchema = z.object({
    value: z.string().optional(),
    name: z.string().optional(),
    fieldID: z.number().optional(),
    id: z.number().optional()
});

const ProviderFormSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    values: z.array(ProviderFormValueSchema).optional()
});

const ProviderAppointmentSchema = z.object({
    id: z.number(),
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
    amountPaid: z.union([z.string(), z.number()]).optional(),
    type: z.string().optional(),
    appointmentTypeID: z.number().optional(),
    classID: z.number().nullable().optional(),
    duration: z.union([z.string(), z.number()]).optional(),
    calendar: z.string().optional(),
    calendarID: z.number().optional(),
    location: z.string().optional(),
    certificate: z.string().nullable().optional(),
    confirmationPage: z.string().optional(),
    formsText: z.string().optional(),
    notes: z.string().optional(),
    timezone: z.string().optional(),
    forms: z.array(ProviderFormSchema).optional(),
    labels: z.array(ProviderLabelSchema).nullable().optional(),
    fields: z.array(z.object({ id: z.number(), value: z.string() })).optional()
});

const InputSchema = z.object({
    id: z.number().describe('Appointment ID. Example: 1722114427'),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    certificate: z.string().optional(),
    fields: z.array(z.object({ id: z.number(), value: z.string() })).optional(),
    notes: z.string().optional(),
    labels: z
        .array(z.object({ id: z.number() }))
        .max(1)
        .optional(),
    smsOptIn: z.boolean().optional(),
    admin: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.number(),
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
    amountPaid: z.union([z.string(), z.number()]).optional(),
    type: z.string().optional(),
    appointmentTypeID: z.number().optional(),
    classID: z.number().nullable().optional(),
    duration: z.union([z.string(), z.number()]).optional(),
    calendar: z.string().optional(),
    calendarID: z.number().optional(),
    location: z.string().optional(),
    certificate: z.string().nullable().optional(),
    confirmationPage: z.string().optional(),
    formsText: z.string().optional(),
    notes: z.string().optional(),
    timezone: z.string().optional(),
    forms: z.array(ProviderFormSchema).optional(),
    labels: z.array(ProviderLabelSchema).optional(),
    fields: z.array(z.object({ id: z.number(), value: z.string() })).optional()
});

const action = createAction({
    description: 'Update an appointment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.acuityscheduling.com/reference/put-appointments-id
            endpoint: `/appointments/${encodeURIComponent(input.id)}`,
            params: {
                ...(input.admin !== undefined && { admin: String(input.admin) })
            },
            data: {
                ...(input.firstName !== undefined && { firstName: input.firstName }),
                ...(input.lastName !== undefined && { lastName: input.lastName }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.phone !== undefined && { phone: input.phone }),
                ...(input.certificate !== undefined && { certificate: input.certificate }),
                ...(input.fields !== undefined && { fields: input.fields }),
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.labels !== undefined && { labels: input.labels }),
                ...(input.smsOptIn !== undefined && { smsOptIn: input.smsOptIn })
            },
            retries: 3
        });

        const appointment = ProviderAppointmentSchema.parse(response.data);

        return {
            id: appointment.id,
            ...(appointment.firstName !== undefined && { firstName: appointment.firstName }),
            ...(appointment.lastName !== undefined && { lastName: appointment.lastName }),
            ...(appointment.phone !== undefined && { phone: appointment.phone }),
            ...(appointment.email !== undefined && { email: appointment.email }),
            ...(appointment.date !== undefined && { date: appointment.date }),
            ...(appointment.time !== undefined && { time: appointment.time }),
            ...(appointment.endTime !== undefined && { endTime: appointment.endTime }),
            ...(appointment.dateCreated !== undefined && { dateCreated: appointment.dateCreated }),
            ...(appointment.datetime !== undefined && { datetime: appointment.datetime }),
            ...(appointment.price !== undefined && { price: appointment.price }),
            ...(appointment.paid !== undefined && { paid: appointment.paid }),
            ...(appointment.amountPaid !== undefined && { amountPaid: appointment.amountPaid }),
            ...(appointment.type !== undefined && { type: appointment.type }),
            ...(appointment.appointmentTypeID !== undefined && { appointmentTypeID: appointment.appointmentTypeID }),
            ...(appointment.classID !== undefined && { classID: appointment.classID }),
            ...(appointment.duration !== undefined && { duration: appointment.duration }),
            ...(appointment.calendar !== undefined && { calendar: appointment.calendar }),
            ...(appointment.calendarID !== undefined && { calendarID: appointment.calendarID }),
            ...(appointment.location !== undefined && { location: appointment.location }),
            ...(appointment.certificate !== undefined && { certificate: appointment.certificate }),
            ...(appointment.confirmationPage !== undefined && { confirmationPage: appointment.confirmationPage }),
            ...(appointment.formsText !== undefined && { formsText: appointment.formsText }),
            ...(appointment.notes !== undefined && { notes: appointment.notes }),
            ...(appointment.timezone !== undefined && { timezone: appointment.timezone }),
            ...(appointment.forms !== undefined && { forms: appointment.forms }),
            ...(appointment.labels != null && { labels: appointment.labels }),
            ...(appointment.fields !== undefined && { fields: appointment.fields })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
