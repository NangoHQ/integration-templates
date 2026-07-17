import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    eventId: z.string().describe('Event Id or Instance id. Example: "ocQHyuzHvysMo5N5VsXc"'),
    title: z.string().optional().describe('Title. Example: "Test Event"'),
    meetingLocationType: z.enum(['custom', 'zoom', 'gmeet', 'phone', 'address', 'ms_teams', 'google']).optional(),
    meetingLocationId: z.string().optional().describe('The unique identifier for the meeting location. Example: "custom_0"'),
    overrideLocationConfig: z.boolean().optional(),
    appointmentStatus: z.enum(['new', 'confirmed', 'cancelled', 'showed', 'noshow', 'invalid']).optional(),
    assignedUserId: z.string().optional().describe('Assigned User Id. Example: "0007BWpSzSwfiuSl0tR2"'),
    description: z.string().optional().describe('Appointment Description. Example: "Booking a call to discuss the project"'),
    address: z.string().optional().describe('Appointment Address. Example: "Zoom"'),
    ignoreDateRange: z.boolean().optional(),
    toNotify: z.boolean().optional(),
    ignoreFreeSlotValidation: z.boolean().optional(),
    rrule: z.string().optional().describe('RRULE as per the iCalendar (RFC 5545) specification for recurring events.'),
    calendarId: z.string().optional().describe('Calendar Id. Example: "CVokAlI8fgw4WYWoCtQz"'),
    startTime: z.string().optional().describe('Start Time. Example: "2021-06-23T03:30:00+05:30"'),
    endTime: z.string().optional().describe('End Time. Example: "2021-06-23T04:30:00+05:30"')
});

const ProviderAppointmentSchema = z.object({
    id: z.string(),
    calendarId: z.string(),
    locationId: z.string(),
    contactId: z.string(),
    startTime: z.string().nullish(),
    endTime: z.string().nullish(),
    title: z.string().nullish(),
    meetingLocationType: z.string().nullish(),
    appointmentStatus: z.string().nullish(),
    assignedUserId: z.string().nullish(),
    address: z.string().nullish(),
    isRecurring: z.boolean().nullish(),
    rrule: z.string().nullish()
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
    appointmentStatus: z.string().optional(),
    assignedUserId: z.string().optional(),
    address: z.string().optional(),
    isRecurring: z.boolean().optional(),
    rrule: z.string().optional()
});

const action = createAction({
    description: 'Update an appointment in HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['calendars/events.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://highlevel.stoplight.io/docs/integrations/calendars/update-appointment
            endpoint: `/calendars/events/appointments/${encodeURIComponent(input.eventId)}`,
            headers: {
                Version: '2021-07-28'
            },
            data: {
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
                ...(input.rrule !== undefined && { rrule: input.rrule }),
                ...(input.calendarId !== undefined && { calendarId: input.calendarId }),
                ...(input.startTime !== undefined && { startTime: input.startTime }),
                ...(input.endTime !== undefined && { endTime: input.endTime })
            },
            retries: 3
        });

        const providerAppointment = ProviderAppointmentSchema.parse(response.data);

        return {
            id: providerAppointment.id,
            calendarId: providerAppointment.calendarId,
            locationId: providerAppointment.locationId,
            contactId: providerAppointment.contactId,
            ...(providerAppointment.startTime != null && { startTime: providerAppointment.startTime }),
            ...(providerAppointment.endTime != null && { endTime: providerAppointment.endTime }),
            ...(providerAppointment.title != null && { title: providerAppointment.title }),
            ...(providerAppointment.meetingLocationType != null && { meetingLocationType: providerAppointment.meetingLocationType }),
            ...(providerAppointment.appointmentStatus != null && { appointmentStatus: providerAppointment.appointmentStatus }),
            ...(providerAppointment.assignedUserId != null && { assignedUserId: providerAppointment.assignedUserId }),
            ...(providerAppointment.address != null && { address: providerAppointment.address }),
            ...(providerAppointment.isRecurring != null && { isRecurring: providerAppointment.isRecurring }),
            ...(providerAppointment.rrule != null && { rrule: providerAppointment.rrule })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
