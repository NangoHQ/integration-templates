import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    max: z.number().optional().describe('Maximum number of results. Default: 100'),
    minDate: z.string().optional().describe('Only get appointments on this date and after'),
    maxDate: z.string().optional().describe('Only get appointments on this date and before'),
    calendarID: z.number().optional().describe('Show only appointments on calendar with specified ID'),
    appointmentTypeID: z.number().optional().describe('Show only appointments of this type'),
    canceled: z.boolean().optional().describe('Include canceled appointments. Default: false'),
    firstName: z.string().optional().describe('Filter appointments for client first name'),
    lastName: z.string().optional().describe('Filter appointments for client last name'),
    email: z.string().optional().describe('Filter appointments for client e-mail address'),
    phone: z.string().optional().describe('Filter appointments for client phone number'),
    fieldId: z.string().optional().describe('Filter appointments matching a particular custom intake form field'),
    excludeForms: z.boolean().optional().describe('Do not include intake forms in the response. Default: false'),
    direction: z.string().optional().describe('Sort direction: ASC or DESC. Default: DESC')
});

const LabelSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        color: z.string()
    })
    .passthrough();

const FormValueSchema = z
    .object({
        id: z.number(),
        fieldID: z.number(),
        name: z.string(),
        value: z.string()
    })
    .passthrough();

const FormSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        values: z.array(FormValueSchema)
    })
    .passthrough();

const AppointmentSchema = z
    .object({
        id: z.number(),
        firstName: z.string(),
        lastName: z.string(),
        phone: z.string(),
        email: z.string(),
        date: z.string(),
        time: z.string(),
        endTime: z.string(),
        dateCreated: z.string(),
        datetime: z.string(),
        price: z.string(),
        paid: z.string(),
        amountPaid: z.string(),
        type: z.string(),
        appointmentTypeID: z.number(),
        addonIDs: z.array(z.number()),
        classID: z.number().nullable(),
        duration: z.string(),
        calendar: z.string(),
        calendarID: z.number(),
        canClientCancel: z.boolean(),
        canClientReschedule: z.boolean(),
        location: z.string(),
        certificate: z.string().nullable(),
        confirmationPage: z.string(),
        formsText: z.string(),
        notes: z.string(),
        timezone: z.string(),
        forms: z.array(FormSchema).nullable(),
        labels: z.array(LabelSchema).nullable(),
        noShow: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    appointments: z.array(AppointmentSchema)
});

const action = createAction({
    description: 'List appointments.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-appointments',
        group: 'Appointments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.max !== undefined) {
            params['max'] = input.max;
        }
        if (input.minDate !== undefined) {
            params['minDate'] = input.minDate;
        }
        if (input.maxDate !== undefined) {
            params['maxDate'] = input.maxDate;
        }
        if (input.calendarID !== undefined) {
            params['calendarID'] = input.calendarID;
        }
        if (input.appointmentTypeID !== undefined) {
            params['appointmentTypeID'] = input.appointmentTypeID;
        }
        if (input.canceled !== undefined) {
            params['canceled'] = String(input.canceled);
        }
        if (input.firstName !== undefined) {
            params['firstName'] = input.firstName;
        }
        if (input.lastName !== undefined) {
            params['lastName'] = input.lastName;
        }
        if (input.email !== undefined) {
            params['email'] = input.email;
        }
        if (input.phone !== undefined) {
            params['phone'] = input.phone;
        }
        if (input.fieldId !== undefined) {
            params['field:id'] = input.fieldId;
        }
        if (input.excludeForms !== undefined) {
            params['excludeForms'] = String(input.excludeForms);
        }
        if (input.direction !== undefined) {
            params['direction'] = input.direction;
        }

        const config: ProxyConfiguration = {
            // https://developers.acuityscheduling.com/reference/get-appointments
            endpoint: '/appointments',
            params,
            retries: 3
        };

        const response = await nango.get(config);

        const rawAppointments = z.array(z.object({}).passthrough()).parse(response.data);
        const appointments = rawAppointments.map((item) => ({
            ...item,
            labels: Array.isArray(item['labels']) ? item['labels'] : [],
            forms: Array.isArray(item['forms']) ? item['forms'] : []
        }));

        const validatedAppointments = z.array(AppointmentSchema).parse(appointments);

        return {
            appointments: validatedAppointments
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
