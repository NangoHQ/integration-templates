import { createSync } from 'nango';
import { z } from 'zod';

const CalendarSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const CalendarsResponseSchema = z.object({
    calendars: z.array(CalendarSchema).optional()
});

const AppointmentSchema = z.object({
    id: z.string(),
    calendarId: z.string(),
    locationId: z.string(),
    contactId: z.string().optional(),
    groupId: z.string().optional(),
    appointmentStatus: z.string().optional(),
    assignedUserId: z.string().optional(),
    users: z.array(z.string()).optional(),
    notes: z.string().optional(),
    title: z.string().optional(),
    address: z.string().optional(),
    description: z.string().optional(),
    isRecurring: z.boolean().optional(),
    rrule: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    dateAdded: z.string().optional(),
    dateUpdated: z.string().optional(),
    assignedResources: z.array(z.string()).optional(),
    masterEventId: z.string().optional()
});

const EventsResponseSchema = z.object({
    events: z.array(AppointmentSchema).optional()
});

const AppointmentModelSchema = z.object({
    id: z.string(),
    calendarId: z.string(),
    locationId: z.string(),
    contactId: z.string().optional(),
    groupId: z.string().optional(),
    appointmentStatus: z.string().optional(),
    assignedUserId: z.string().optional(),
    users: z.array(z.string()).optional(),
    notes: z.string().optional(),
    title: z.string().optional(),
    address: z.string().optional(),
    description: z.string().optional(),
    isRecurring: z.boolean().optional(),
    rrule: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    dateAdded: z.string().optional(),
    dateUpdated: z.string().optional(),
    assignedResources: z.array(z.string()).optional(),
    masterEventId: z.string().optional()
});

const CalendarCheckpointSchema = z.object({
    startTime: z.number().optional(),
    lastFullResyncAt: z.number().optional()
});

const StateSchema = z.object({
    calendars: z.record(z.string(), CalendarCheckpointSchema).optional()
});

const CheckpointSchema = z.object({
    state: z.string()
});

function decodeState(raw: string | undefined): { calendars: Record<string, z.infer<typeof CalendarCheckpointSchema>> } {
    if (!raw) {
        return { calendars: {} };
    }
    // @allowTryCatch JSON.parse can throw on malformed checkpoint state; fallback to empty state is safe.
    try {
        const parsed = JSON.parse(raw);
        const result = StateSchema.safeParse(parsed);
        if (result.success) {
            return { calendars: result.data.calendars ?? {} };
        }
        return { calendars: {} };
    } catch {
        return { calendars: {} };
    }
}

const sync = createSync({
    description: 'Sync appointments (calendar events) from HighLevel',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Appointment: AppointmentModelSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const safeCheckpoint = CheckpointSchema.safeParse(checkpoint);
        let calendarCheckpoints: Record<string, z.infer<typeof CalendarCheckpointSchema>>;
        if (safeCheckpoint.success) {
            calendarCheckpoints = decodeState(safeCheckpoint.data.state).calendars;
        } else {
            calendarCheckpoints = {};
        }

        const connection = await nango.getConnection();
        const connectionSchema = z.object({
            connection_config: z.record(z.string(), z.unknown()).optional(),
            metadata: z.record(z.string(), z.unknown()).optional()
        });
        const parsedConnection = connectionSchema.safeParse(connection);
        if (!parsedConnection.success) {
            throw new Error('Failed to parse connection');
        }

        let rawLocationId = parsedConnection.data.connection_config?.['locationId'] ?? parsedConnection.data.metadata?.['locationId'];
        if (typeof rawLocationId !== 'string') {
            const metadata = await nango.getMetadata();
            const metadataSchema = z.record(z.string(), z.unknown());
            const parsedMetadata = metadataSchema.safeParse(metadata);
            if (parsedMetadata.success) {
                rawLocationId = parsedMetadata.data['locationId'];
            }
        }
        if (typeof rawLocationId !== 'string') {
            throw new Error('locationId is required but not found in connection configuration');
        }
        const locationId = rawLocationId;

        // https://highlevel.stoplight.io/docs/integrations/get-calendars
        const calendarsResponse = await nango.get({
            endpoint: '/calendars/',
            params: {
                locationId
            },
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const parsedCalendars = CalendarsResponseSchema.safeParse(calendarsResponse.data);
        if (!parsedCalendars.success) {
            throw new Error(`Failed to parse calendars response: ${parsedCalendars.error.message}`);
        }

        const calendars = parsedCalendars.data.calendars ?? [];
        if (calendars.length === 0) {
            return;
        }

        const now = Date.now();
        const endTime = 4102444800000;
        // HighLevel's calendar events endpoint filters by event start time, not update time, so
        // an appointment that is edited or cancelled without its startTime changing would never
        // be re-fetched once the checkpoint moves past it. Keep the next checkpoint trailing
        // behind `now` so recently-started appointments stay in the fetch window on every run.
        const OVERLAP_MS = 24 * 60 * 60 * 1000;
        // The trailing overlap only catches edits to appointments that started within the last
        // day. Periodically do a full historical walk per calendar so edits/cancellations to
        // older appointments still eventually get reconciled.
        const FULL_RESYNC_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

        for (const calendar of calendars) {
            if (!calendar.id || typeof calendar.id !== 'string') {
                throw new Error('Calendar id is required');
            }

            const calendarId = calendar.id;
            const calendarCheckpoint = calendarCheckpoints[calendarId] ?? {};
            const lastFullResyncAt = calendarCheckpoint.lastFullResyncAt ?? 0;
            const dueForFullResync = now - lastFullResyncAt >= FULL_RESYNC_INTERVAL_MS;
            const startTime = dueForFullResync ? 0 : (calendarCheckpoint.startTime ?? 0);

            // https://highlevel.stoplight.io/docs/integrations/get-calendar-events
            const eventsResponse = await nango.get({
                endpoint: '/calendars/events',
                params: {
                    locationId,
                    calendarId,
                    startTime: String(startTime),
                    endTime: String(endTime)
                },
                headers: {
                    Version: '2021-07-28'
                },
                retries: 3
            });

            const parsedEvents = EventsResponseSchema.safeParse(eventsResponse.data);
            if (!parsedEvents.success) {
                throw new Error(`Failed to parse events response: ${parsedEvents.error.message}`);
            }

            const events = parsedEvents.data.events ?? [];
            const appointments = events.map((event) => ({
                id: event.id,
                calendarId: event.calendarId,
                locationId: event.locationId,
                ...(event.contactId != null && { contactId: event.contactId }),
                ...(event.groupId != null && { groupId: event.groupId }),
                ...(event.appointmentStatus != null && { appointmentStatus: event.appointmentStatus }),
                ...(event.assignedUserId != null && { assignedUserId: event.assignedUserId }),
                ...(event.users != null && { users: event.users }),
                ...(event.notes != null && { notes: event.notes }),
                ...(event.title != null && { title: event.title }),
                ...(event.address != null && { address: event.address }),
                ...(event.description != null && { description: event.description }),
                ...(event.isRecurring != null && { isRecurring: event.isRecurring }),
                ...(event.rrule != null && { rrule: event.rrule }),
                ...(event.startTime != null && { startTime: event.startTime }),
                ...(event.endTime != null && { endTime: event.endTime }),
                ...(event.dateAdded != null && { dateAdded: event.dateAdded }),
                ...(event.dateUpdated != null && { dateUpdated: event.dateUpdated }),
                ...(event.assignedResources != null && { assignedResources: event.assignedResources }),
                ...(event.masterEventId != null && { masterEventId: event.masterEventId })
            }));

            if (appointments.length > 0) {
                await nango.batchSave(appointments, 'Appointment');
            }

            calendarCheckpoints = {
                ...calendarCheckpoints,
                [calendarId]: {
                    startTime: Math.max(0, now - OVERLAP_MS),
                    lastFullResyncAt: dueForFullResync ? now : lastFullResyncAt
                }
            };

            await nango.saveCheckpoint({
                state: JSON.stringify({
                    calendars: calendarCheckpoints
                })
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
