import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    cursor: z.string()
});

const EventHostSchema = z
    .object({
        id: z.number().describe('Host user numeric identifier'),
        name: z.string().describe('Host display name'),
        email: z.string().describe('Host email address'),
        timeZone: z.string().describe('Host IANA timezone')
    })
    .describe('A host assigned to a booking event');

const EventAttendeeSchema = z
    .object({
        name: z.string().describe('Attendee full name'),
        email: z.string().describe('Attendee email address'),
        timeZone: z.string().describe('Attendee IANA timezone'),
        absent: z.boolean().describe('Whether the attendee was marked as a no-show')
    })
    .describe('An attendee registered for a booking event');

const EventSchema = z
    .object({
        id: z.string().describe('Unique booking UID used as stable record identifier'),
        title: z.string().describe('Booking event title'),
        description: z.string().describe('Detailed description of the booking'),
        status: z.enum(['cancelled', 'accepted', 'rejected', 'pending']).describe('Current booking status'),
        start: z.string().describe('Booking start time in ISO 8601 format'),
        end: z.string().describe('Booking end time in ISO 8601 format'),
        duration: z.number().describe('Duration of the booking in minutes'),
        location: z.string().describe('Meeting location or video conference URL'),
        createdAt: z.string().describe('Timestamp when the booking was created'),
        updatedAt: z.string().optional().describe('Timestamp when the booking was last updated'),
        eventTypeId: z.number().optional().describe('Deprecated numeric event type identifier'),
        eventTypeSlug: z.string().optional().describe('URL-friendly slug of the event type'),
        hosts: z.array(EventHostSchema).describe('List of hosts assigned to this booking'),
        attendees: z.array(EventAttendeeSchema).describe('List of attendees for this booking'),
        guests: z.array(z.string()).optional().describe('Additional guest email addresses'),
        metadata: z.record(z.string(), z.string()).optional().describe('Custom metadata key-value pairs attached to the booking'),
        cancellationReason: z.string().optional().describe('Reason provided when the booking was cancelled'),
        rescheduledFromUid: z.string().optional().describe('UID of the previous booking this was rescheduled from'),
        icsUid: z.string().optional().describe('UID of the associated ICS calendar event')
    })
    .describe('An upcoming calendar booking event retrieved from Cal.com');

const ProviderEventTypeSchema = z.object({
    id: z.number(),
    slug: z.string()
});

const ProviderHostSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    displayEmail: z.string().optional(),
    username: z.string().optional(),
    timeZone: z.string()
});

const ProviderAttendeeSchema = z.object({
    name: z.string(),
    email: z.string(),
    displayEmail: z.string().optional(),
    timeZone: z.string(),
    language: z.string().optional(),
    absent: z.boolean(),
    phoneNumber: z.string().optional().nullable(),
    seatUid: z.string().optional(),
    createdAt: z.string().optional(),
    bookingFieldsResponses: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.string()).optional()
});

const ProviderBookingSchema = z.object({
    id: z.number(),
    uid: z.string(),
    title: z.string(),
    description: z.string(),
    hosts: z.array(ProviderHostSchema),
    status: z.enum(['cancelled', 'accepted', 'rejected', 'pending']),
    cancellationReason: z.string().optional().nullable(),
    cancelledByEmail: z.string().optional().nullable(),
    reschedulingReason: z.string().optional().nullable(),
    rescheduledByEmail: z.string().optional().nullable(),
    rescheduledFromUid: z.string().optional().nullable(),
    rescheduledToUid: z.string().optional().nullable(),
    start: z.string(),
    end: z.string(),
    duration: z.number(),
    eventTypeId: z.number(),
    eventType: ProviderEventTypeSchema,
    location: z.string(),
    absentHost: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    rating: z.number().optional().nullable(),
    icsUid: z.string().optional().nullable(),
    attendees: z.array(ProviderAttendeeSchema).optional(),
    guests: z.array(z.string()).optional(),
    bookingFieldsResponses: z.record(z.string(), z.unknown()).optional(),
    recurringBookingUid: z.string().optional()
});

const sync = createSync({
    description: 'Retrieve all upcoming events per a user',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Event: EventSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let cursor = checkpoint != null && typeof checkpoint['cursor'] === 'string' ? checkpoint['cursor'] : undefined;

        await nango.trackDeletesStart('Event');

        const params: Record<string, string> = {
            status: 'upcoming'
        };
        if (cursor !== undefined) {
            params['cursor'] = cursor;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://cal.com/docs/api-reference/v2/bookings/get-all-bookings
            endpoint: '/bookings',
            params,
            headers: {
                'cal-api-version': '2026-05-01'
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'pagination.nextCursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async (paginationState) => {
                    const nextPageParam = paginationState.nextPageParam;
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const events = page.map((item) => {
                const parsed = ProviderBookingSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse booking: ${parsed.error.message}`);
                }
                const record = parsed.data;
                return {
                    id: record.uid,
                    title: record.title,
                    description: record.description,
                    status: record.status,
                    start: record.start,
                    end: record.end,
                    duration: record.duration,
                    location: record.location,
                    createdAt: record.createdAt,
                    ...(record.updatedAt != null && { updatedAt: record.updatedAt }),
                    eventTypeId: record.eventTypeId,
                    ...(record.eventType?.slug && { eventTypeSlug: record.eventType.slug }),
                    hosts: record.hosts.map((host) => ({
                        id: host.id,
                        name: host.name,
                        email: host.email,
                        timeZone: host.timeZone
                    })),
                    attendees: (record.attendees ?? []).map((attendee) => ({
                        name: attendee.name,
                        email: attendee.email,
                        timeZone: attendee.timeZone,
                        absent: attendee.absent
                    })),
                    guests: record.guests,
                    ...(record.metadata && Object.keys(record.metadata).length > 0 && { metadata: record.metadata }),
                    ...(record.cancellationReason && { cancellationReason: record.cancellationReason }),
                    ...(record.rescheduledFromUid && { rescheduledFromUid: record.rescheduledFromUid }),
                    ...(record.icsUid && { icsUid: record.icsUid })
                };
            });

            if (events.length > 0) {
                await nango.batchSave(events, 'Event');
            }

            if (cursor !== undefined) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Event');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
