import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    eventId: z.string().describe('Appointment event ID. Example: "ocQHyuzHvysMo5N5VsXc"')
});

const CreatedOrUpdatedBySchema = z.object({
    userId: z.string().nullish(),
    source: z.string().nullish()
});

const AppointmentMetaSchema = z
    .object({
        slotType: z.string().nullish()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().nullish(),
    calendarId: z.string(),
    locationId: z.string(),
    contactId: z.string().nullish(),
    appointmentStatus: z.string().nullish(),
    startTime: z.string().nullish(),
    endTime: z.string().nullish(),
    dateAdded: z.string().nullish(),
    dateUpdated: z.string().nullish(),
    address: z.string().nullish(),
    assignedUserId: z.string().nullish(),
    users: z.array(z.string()).nullish(),
    notes: z.string().nullish(),
    description: z.string().nullish(),
    groupId: z.string().nullish(),
    isRecurring: z.boolean().nullish(),
    rrule: z.string().nullish(),
    assignedResources: z.array(z.string()).nullish(),
    createdBy: CreatedOrUpdatedBySchema.nullish(),
    masterEventId: z.string().nullish(),
    appointmentMeta: AppointmentMetaSchema.nullish(),
    deleted: z.boolean().nullish()
});

const ApiResponseSchema = z.object({
    appointment: z.unknown()
});

const action = createAction({
    description: 'Retrieve a single appointment from HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['calendars/events.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://highlevel.stoplight.io/docs/integrations/get-appointment
        const response = await nango.get({
            endpoint: `/calendars/events/appointments/${encodeURIComponent(input.eventId)}`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const parsed = ApiResponseSchema.parse(response.data);
        const appointment = z
            .object({
                id: z.string(),
                title: z.string(),
                calendarId: z.string(),
                locationId: z.string(),
                contactId: z.string(),
                appointmentStatus: z.string(),
                startTime: z.string().nullish(),
                endTime: z.string().nullish(),
                dateAdded: z.string().nullish(),
                dateUpdated: z.string().nullish(),
                address: z.string().nullish(),
                assignedUserId: z.string().nullish(),
                users: z.array(z.string()).nullish(),
                notes: z.string().nullish(),
                description: z.string().nullish(),
                groupId: z.string().nullish(),
                isRecurring: z.boolean().nullish(),
                rrule: z.string().nullish(),
                assignedResources: z.array(z.string()).nullish(),
                createdBy: CreatedOrUpdatedBySchema.nullish(),
                masterEventId: z.string().nullish(),
                appointmentMeta: AppointmentMetaSchema.nullish(),
                deleted: z.boolean().nullish()
            })
            .parse(parsed.appointment);

        return {
            id: appointment.id,
            calendarId: appointment.calendarId,
            locationId: appointment.locationId,
            ...(appointment.title != null && { title: appointment.title }),
            ...(appointment.contactId != null && { contactId: appointment.contactId }),
            ...(appointment.appointmentStatus != null && { appointmentStatus: appointment.appointmentStatus }),
            ...(appointment.startTime != null && { startTime: appointment.startTime }),
            ...(appointment.endTime != null && { endTime: appointment.endTime }),
            ...(appointment.dateAdded != null && { dateAdded: appointment.dateAdded }),
            ...(appointment.dateUpdated != null && { dateUpdated: appointment.dateUpdated }),
            ...(appointment.address != null && { address: appointment.address }),
            ...(appointment.assignedUserId != null && { assignedUserId: appointment.assignedUserId }),
            ...(appointment.users != null && { users: appointment.users }),
            ...(appointment.notes != null && { notes: appointment.notes }),
            ...(appointment.description != null && { description: appointment.description }),
            ...(appointment.groupId != null && { groupId: appointment.groupId }),
            ...(appointment.isRecurring != null && { isRecurring: appointment.isRecurring }),
            ...(appointment.rrule != null && { rrule: appointment.rrule }),
            ...(appointment.assignedResources != null && { assignedResources: appointment.assignedResources }),
            ...(appointment.createdBy != null && { createdBy: appointment.createdBy }),
            ...(appointment.masterEventId != null && { masterEventId: appointment.masterEventId }),
            ...(appointment.appointmentMeta != null && { appointmentMeta: appointment.appointmentMeta }),
            ...(appointment.deleted != null && { deleted: appointment.deleted })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
