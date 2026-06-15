import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    datetime: z
        .string()
        .describe('Required date and time for the appointment, parsed by strtotime in the business or calendar timezone. Example: "2026-06-30T10:00:00+0300"'),
    appointmentTypeID: z.number().describe('Appointment type ID. Example: 94517100'),
    firstName: z.string().describe('Client first name. Example: "Bob"'),
    lastName: z.string().describe('Client last name. Example: "McTest"'),
    email: z.string().describe('Client e-mail address. Example: "bob.mctest@example.com"'),
    calendarID: z.number().optional().describe('Calendar ID. Example: 14209019'),
    phone: z.string().optional().describe('Client phone number. Example: "(123) 555-0102"'),
    timezone: z.string().optional().describe('Client timezone. Example: "America/New_York"'),
    certificate: z.string().optional().describe('Package or coupon certificate code. Example: "ABC123"'),
    fields: z
        .array(
            z.object({
                id: z.number().describe('Field ID. Example: 1'),
                value: z.string().describe('Field value. Example: "Party time!"')
            })
        )
        .optional()
        .describe('Intake form field values.'),
    notes: z.string().optional().describe('Appointment notes. Only settable when booking as an admin.'),
    addonIDs: z.array(z.number()).optional().describe('IDs of addons to include in the appointment. Example: [1]'),
    labels: z
        .array(
            z.object({
                id: z.number().describe('Label ID. Example: 24774624')
            })
        )
        .max(1)
        .optional()
        .describe('Label objects to apply to the appointment. Currently only accepts an array of length 1.'),
    smsOptIn: z.boolean().optional().describe('Indicates whether the client has explicitly given permission to receive SMS messages.'),
    admin: z.boolean().optional().describe('Pass true to disable availability and validation checks. Requires calendarID.'),
    noEmail: z.boolean().optional().describe('Pass true to skip sending confirmation emails.')
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
    datetime: z.string(),
    price: z.string().optional(),
    paid: z.string().optional(),
    amountPaid: z.string().optional(),
    type: z.string().optional(),
    appointmentTypeID: z.number().optional(),
    addonIDs: z.array(z.number()).nullable().optional(),
    classID: z.number().nullable().optional(),
    duration: z.string().optional(),
    calendar: z.string().optional(),
    calendarID: z.number().optional(),
    canClientCancel: z.boolean().optional(),
    canClientReschedule: z.boolean().optional(),
    location: z.string().optional(),
    certificate: z.string().nullable().optional(),
    confirmationPage: z.string().optional(),
    formsText: z.string().optional(),
    notes: z.string().optional(),
    timezone: z.string().optional(),
    forms: z.array(z.object({}).passthrough()).nullable().optional(),
    labels: z
        .array(
            z.object({
                id: z.number(),
                name: z.string(),
                color: z.string()
            })
        )
        .nullable()
        .optional()
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
    datetime: z.string(),
    price: z.string().optional(),
    paid: z.string().optional(),
    amountPaid: z.string().optional(),
    type: z.string().optional(),
    appointmentTypeID: z.number().optional(),
    addonIDs: z.array(z.number()).optional(),
    classID: z.number().optional(),
    duration: z.string().optional(),
    calendar: z.string().optional(),
    calendarID: z.number().optional(),
    canClientCancel: z.boolean().optional(),
    canClientReschedule: z.boolean().optional(),
    location: z.string().optional(),
    certificate: z.string().optional(),
    confirmationPage: z.string().optional(),
    formsText: z.string().optional(),
    notes: z.string().optional(),
    timezone: z.string().optional(),
    forms: z.array(z.object({}).passthrough()).optional(),
    labels: z
        .array(
            z.object({
                id: z.number(),
                name: z.string(),
                color: z.string()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Create an appointment.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-appointment',
        group: 'Appointments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input['admin'] === true && input['calendarID'] === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'calendarID is required when admin is true'
            });
        }

        const params: Record<string, string | number | string[] | number[]> = {};
        if (input['admin'] === true) {
            params['admin'] = 'true';
        }
        if (input['noEmail'] === true) {
            params['noEmail'] = 'true';
        }

        const body: Record<string, unknown> = {
            datetime: input['datetime'],
            appointmentTypeID: input['appointmentTypeID'],
            firstName: input['firstName'],
            lastName: input['lastName'],
            email: input['email']
        };

        if (input['calendarID'] !== undefined) {
            body['calendarID'] = input['calendarID'];
        }
        if (input['phone'] !== undefined) {
            body['phone'] = input['phone'];
        }
        if (input['timezone'] !== undefined) {
            body['timezone'] = input['timezone'];
        }
        if (input['certificate'] !== undefined) {
            body['certificate'] = input['certificate'];
        }
        if (input['fields'] !== undefined) {
            body['fields'] = input['fields'];
        }
        if (input['notes'] !== undefined) {
            body['notes'] = input['notes'];
        }
        if (input['addonIDs'] !== undefined) {
            body['addonIDs'] = input['addonIDs'];
        }
        if (input['labels'] !== undefined) {
            body['labels'] = input['labels'];
        }
        if (input['smsOptIn'] !== undefined) {
            body['smsOptIn'] = input['smsOptIn'];
        }

        const config: ProxyConfiguration = {
            // https://developers.acuityscheduling.com/reference/post-appointments
            endpoint: '/appointments',
            data: body,
            retries: 3,
            ...(Object.keys(params).length > 0 && { params })
        };

        const response = await nango.post(config);
        const appointment = ProviderAppointmentSchema.parse(response.data);

        return {
            id: appointment['id'],
            ...(appointment['firstName'] !== undefined && { firstName: appointment['firstName'] }),
            ...(appointment['lastName'] !== undefined && { lastName: appointment['lastName'] }),
            ...(appointment['phone'] !== undefined && { phone: appointment['phone'] }),
            ...(appointment['email'] !== undefined && { email: appointment['email'] }),
            ...(appointment['date'] !== undefined && { date: appointment['date'] }),
            ...(appointment['time'] !== undefined && { time: appointment['time'] }),
            ...(appointment['endTime'] !== undefined && { endTime: appointment['endTime'] }),
            ...(appointment['dateCreated'] !== undefined && { dateCreated: appointment['dateCreated'] }),
            datetime: appointment['datetime'],
            ...(appointment['price'] !== undefined && { price: appointment['price'] }),
            ...(appointment['paid'] !== undefined && { paid: appointment['paid'] }),
            ...(appointment['amountPaid'] !== undefined && { amountPaid: appointment['amountPaid'] }),
            ...(appointment['type'] !== undefined && { type: appointment['type'] }),
            ...(appointment['appointmentTypeID'] !== undefined && { appointmentTypeID: appointment['appointmentTypeID'] }),
            ...(appointment['addonIDs'] !== null && appointment['addonIDs'] !== undefined && { addonIDs: appointment['addonIDs'] }),
            ...(appointment['classID'] !== null && appointment['classID'] !== undefined && { classID: appointment['classID'] }),
            ...(appointment['duration'] !== undefined && { duration: appointment['duration'] }),
            ...(appointment['calendar'] !== undefined && { calendar: appointment['calendar'] }),
            ...(appointment['calendarID'] !== undefined && { calendarID: appointment['calendarID'] }),
            ...(appointment['canClientCancel'] !== undefined && { canClientCancel: appointment['canClientCancel'] }),
            ...(appointment['canClientReschedule'] !== undefined && { canClientReschedule: appointment['canClientReschedule'] }),
            ...(appointment['location'] !== undefined && { location: appointment['location'] }),
            ...(appointment['certificate'] !== null && appointment['certificate'] !== undefined && { certificate: appointment['certificate'] }),
            ...(appointment['confirmationPage'] !== undefined && { confirmationPage: appointment['confirmationPage'] }),
            ...(appointment['formsText'] !== undefined && { formsText: appointment['formsText'] }),
            ...(appointment['notes'] !== undefined && { notes: appointment['notes'] }),
            ...(appointment['timezone'] !== undefined && { timezone: appointment['timezone'] }),
            ...(appointment['forms'] !== null && appointment['forms'] !== undefined && { forms: appointment['forms'] }),
            ...(appointment['labels'] !== null && appointment['labels'] !== undefined && { labels: appointment['labels'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
