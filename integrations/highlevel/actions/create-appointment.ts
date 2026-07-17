import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().describe('Calendar ID. Example: "EezkTNetkctqSCPB5LCc"'),
    locationId: z.string().describe('Location ID. Example: "AYg6rIXHN1fXdXjGcYvI"'),
    contactId: z.string().describe('Contact ID. Example: "jKy701hlSIPdiw0x12WA"'),
    startTime: z.string().describe('Start time in ISO 8601 format. Example: "2026-07-20T10:00:00Z"'),
    endTime: z.string().optional().describe('End time in ISO 8601 format. Example: "2026-07-20T11:00:00Z"'),
    title: z.string().optional().describe('Appointment title'),
    meetingLocationType: z.string().optional().describe('Meeting location type (custom, zoom, gmeet, phone, address, ms_teams, google)'),
    meetingLocationId: z.string().optional().describe('Meeting location ID'),
    overrideLocationConfig: z.boolean().optional().describe('Flag to override location config'),
    appointmentStatus: z.string().optional().describe('Appointment status (new, confirmed, cancelled, showed, noshow, invalid)'),
    assignedUserId: z.string().optional().describe('Assigned user ID'),
    description: z.string().optional().describe('Appointment description'),
    address: z.string().optional().describe('Appointment address'),
    ignoreDateRange: z.boolean().optional().describe('Ignore minimum scheduling notice and date range'),
    toNotify: z.boolean().optional().describe('If false, automations will not run'),
    ignoreFreeSlotValidation: z.boolean().optional().describe('Bypass free slot validation'),
    rrule: z.string().optional().describe('RRULE for recurring events')
});

const ProviderAppointmentSchema = z.object({
    id: z.string(),
    calendarId: z.string(),
    locationId: z.string(),
    contactId: z.string(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    title: z.string().optional(),
    meetingLocationType: z.string().optional(),
    status: z.string().optional(),
    appointmentStatus: z.string().optional(),
    assignedUserId: z.string().optional(),
    address: z.string().optional(),
    isRecurring: z.boolean().optional(),
    rrule: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    calendarId: z.string(),
    locationId: z.string(),
    contactId: z.string(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    title: z.string().optional(),
    meetingLocationType: z.string().optional(),
    status: z.string().optional(),
    appointmentStatus: z.string().optional(),
    assignedUserId: z.string().optional(),
    address: z.string().optional(),
    isRecurring: z.boolean().optional(),
    rrule: z.string().optional()
});

const action = createAction({
    description: 'Create an appointment on a calendar in HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['calendars/events.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://highlevel.stoplight.io/docs/integrations/Create-appointment
            endpoint: '/calendars/events/appointments',
            headers: {
                Version: '2021-07-28'
            },
            data: {
                calendarId: input.calendarId,
                locationId: input.locationId,
                contactId: input.contactId,
                startTime: input.startTime,
                ...(input.endTime !== undefined && { endTime: input.endTime }),
                ...(input.title !== undefined && { title: input.title }),
                ...(input.meetingLocationType !== undefined && { meetingLocationType: input.meetingLocationType }),
                ...(input.meetingLocationId !== undefined && { meetingLocationId: input.meetingLocationId }),
                ...(input.overrideLocationConfig !== undefined && { overrideLocationConfig: input.overrideLocationConfig }),
                ...(input.appointmentStatus !== undefined && { appointmentStatus: input.appointmentStatus }),
                ...(input.assignedUserId !== undefined && { assignedUserId: input.assignedUserId }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.address !== undefined && { address: input.address }),
                ...(input.ignoreDateRange !== undefined && { ignoreDateRange: input.ignoreDateRange }),
                ...(input.toNotify !== undefined && { toNotify: input.toNotify }),
                ...(input.ignoreFreeSlotValidation !== undefined && { ignoreFreeSlotValidation: input.ignoreFreeSlotValidation }),
                ...(input.rrule !== undefined && { rrule: input.rrule })
            },
            retries: 3
        });

        const providerAppointment = ProviderAppointmentSchema.parse(response.data);

        return {
            id: providerAppointment.id,
            calendarId: providerAppointment.calendarId,
            locationId: providerAppointment.locationId,
            contactId: providerAppointment.contactId,
            ...(providerAppointment.startTime !== undefined && { startTime: providerAppointment.startTime }),
            ...(providerAppointment.endTime !== undefined && { endTime: providerAppointment.endTime }),
            ...(providerAppointment.title !== undefined && { title: providerAppointment.title }),
            ...(providerAppointment.meetingLocationType !== undefined && { meetingLocationType: providerAppointment.meetingLocationType }),
            ...(providerAppointment.status !== undefined && { status: providerAppointment.status }),
            ...(providerAppointment.appointmentStatus !== undefined && { appointmentStatus: providerAppointment.appointmentStatus }),
            ...(providerAppointment.assignedUserId !== undefined && { assignedUserId: providerAppointment.assignedUserId }),
            ...(providerAppointment.address !== undefined && { address: providerAppointment.address }),
            ...(providerAppointment.isRecurring !== undefined && { isRecurring: providerAppointment.isRecurring }),
            ...(providerAppointment.rrule !== undefined && { rrule: providerAppointment.rrule })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
