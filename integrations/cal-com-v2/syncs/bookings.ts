import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderEventTypeSchema = z.object({
    id: z.number(),
    slug: z.string()
});

const ProviderHostSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    displayEmail: z.string(),
    username: z.string().optional(),
    timeZone: z.string()
});

const ProviderAttendeeSchema = z.object({
    name: z.string(),
    email: z.string(),
    displayEmail: z.string(),
    timeZone: z.string(),
    language: z.string().nullish(),
    absent: z.boolean(),
    phoneNumber: z.string().nullish(),
    seatUid: z.string().nullish(),
    createdAt: z.string().nullish(),
    bookingFieldsResponses: z.object({}).passthrough().nullish(),
    metadata: z.object({}).catchall(z.string()).nullish()
});

const ProviderBookingSchema = z.object({
    id: z.number(),
    uid: z.string(),
    title: z.string(),
    description: z.string(),
    hosts: z.array(ProviderHostSchema),
    status: z.enum(['cancelled', 'accepted', 'rejected', 'pending']),
    cancellationReason: z.string().nullish(),
    cancelledByEmail: z.string().nullish(),
    reschedulingReason: z.string().nullish(),
    rescheduledByEmail: z.string().nullish(),
    rescheduledFromUid: z.string().nullish(),
    rescheduledToUid: z.string().nullish(),
    start: z.string(),
    end: z.string(),
    duration: z.number(),
    eventTypeId: z.number().nullish(),
    eventType: ProviderEventTypeSchema.nullish(),
    location: z.string().nullish(),
    absentHost: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string().nullable().nullish(),
    metadata: z.object({}).catchall(z.string()).nullish(),
    rating: z.number().nullish(),
    icsUid: z.string().nullish(),
    attendees: z.array(ProviderAttendeeSchema).nullish(),
    guests: z.array(z.string()).nullish(),
    bookingFieldsResponses: z.object({}).passthrough().nullish(),
    recurringBookingUid: z.string().nullish()
});

const EventTypeSchema = z
    .object({
        id: z.number().describe('Event type identifier'),
        slug: z.string().describe('Event type URL slug')
    })
    .describe('Event type details');

const HostSchema = z
    .object({
        id: z.number().describe('Host user identifier'),
        name: z.string().describe('Host display name'),
        email: z.string().describe('Host email address'),
        displayEmail: z.string().describe('Host display email address'),
        username: z.string().optional().describe('Host username'),
        timeZone: z.string().describe('Host timezone')
    })
    .describe('Booking host');

const AttendeeSchema = z
    .object({
        name: z.string().describe('Attendee name'),
        email: z.string().describe('Attendee email address'),
        displayEmail: z.string().describe('Attendee display email address'),
        timeZone: z.string().describe('Attendee timezone'),
        language: z.string().optional().describe('Attendee preferred language locale'),
        absent: z.boolean().describe('Whether the attendee was marked absent'),
        phoneNumber: z.string().optional().describe('Attendee phone number'),
        seatUid: z.string().optional().describe('Unique seat identifier for seated bookings'),
        createdAt: z.string().optional().describe('When the attendee joined the seated booking'),
        metadata: z.object({}).catchall(z.string()).optional().describe('Attendee metadata key-value pairs'),
        bookingFieldsResponses: z.object({}).passthrough().optional().describe('Attendee booking field responses')
    })
    .describe('Booking attendee');

const BookingSchema = z
    .object({
        id: z.string().describe('Unique booking UID'),
        bookingId: z.number().optional().describe('Numeric booking identifier'),
        title: z.string().describe('Booking title'),
        description: z.string().describe('Booking description'),
        status: z.string().describe('Booking status: cancelled, accepted, rejected, or pending'),
        start: z.string().describe('Booking start time in ISO 8601 format'),
        end: z.string().describe('Booking end time in ISO 8601 format'),
        duration: z.number().describe('Booking duration in minutes'),
        location: z.string().optional().describe('Meeting location URL or address'),
        createdAt: z.string().describe('Booking creation time in ISO 8601 format'),
        updatedAt: z.string().optional().describe('Last booking update time in ISO 8601 format'),
        cancellationReason: z.string().optional().describe('Reason for cancellation'),
        cancelledByEmail: z.string().optional().describe('Email of the user who cancelled the booking'),
        reschedulingReason: z.string().optional().describe('Reason for rescheduling'),
        rescheduledByEmail: z.string().optional().describe('Email of the user who rescheduled the booking'),
        rescheduledFromUid: z.string().optional().describe('UID of the previous booking from which this was rescheduled'),
        rescheduledToUid: z.string().optional().describe('UID of the new booking to which this was rescheduled'),
        recurringBookingUid: z.string().optional().describe('UID of the parent recurring booking'),
        absentHost: z.boolean().describe('Whether the host was marked absent'),
        icsUid: z.string().optional().describe('UID of the ICS calendar event'),
        rating: z.number().optional().describe('Booking rating value'),
        eventTypeId: z.number().optional().describe('Deprecated numeric event type identifier'),
        eventType: EventTypeSchema.optional().describe('Event type details'),
        hosts: z.array(HostSchema).describe('List of booking hosts'),
        attendees: z.array(AttendeeSchema).describe('List of booking attendees'),
        guests: z.array(z.string()).optional().describe('Additional guest email addresses'),
        metadata: z.object({}).catchall(z.string()).optional().describe('Booking metadata key-value pairs'),
        bookingFieldsResponses: z.object({}).passthrough().optional().describe('Booking field responses')
    })
    .describe('A Cal.com booking record');

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

function mapBooking(booking: z.infer<typeof ProviderBookingSchema>): z.infer<typeof BookingSchema> {
    return {
        id: booking.uid,
        ...(booking.id != null && { bookingId: booking.id }),
        title: booking.title,
        description: booking.description,
        status: booking.status,
        start: booking.start,
        end: booking.end,
        duration: booking.duration,
        ...(booking.location != null && { location: booking.location }),
        createdAt: booking.createdAt,
        ...(booking.updatedAt != null && { updatedAt: booking.updatedAt }),
        ...(booking.cancellationReason != null && { cancellationReason: booking.cancellationReason }),
        ...(booking.cancelledByEmail != null && { cancelledByEmail: booking.cancelledByEmail }),
        ...(booking.reschedulingReason != null && { reschedulingReason: booking.reschedulingReason }),
        ...(booking.rescheduledByEmail != null && { rescheduledByEmail: booking.rescheduledByEmail }),
        ...(booking.rescheduledFromUid != null && { rescheduledFromUid: booking.rescheduledFromUid }),
        ...(booking.rescheduledToUid != null && { rescheduledToUid: booking.rescheduledToUid }),
        ...(booking.recurringBookingUid != null && { recurringBookingUid: booking.recurringBookingUid }),
        absentHost: booking.absentHost,
        ...(booking.icsUid != null && { icsUid: booking.icsUid }),
        ...(booking.rating != null && { rating: booking.rating }),
        ...(booking.eventTypeId != null && { eventTypeId: booking.eventTypeId }),
        ...(booking.eventType != null && {
            eventType: {
                id: booking.eventType.id,
                slug: booking.eventType.slug
            }
        }),
        hosts: booking.hosts.map((host) => ({
            id: host.id,
            name: host.name,
            email: host.email,
            displayEmail: host.displayEmail,
            ...(host.username != null && { username: host.username }),
            timeZone: host.timeZone
        })),
        attendees:
            booking.attendees?.map((attendee) => ({
                name: attendee.name,
                email: attendee.email,
                displayEmail: attendee.displayEmail,
                timeZone: attendee.timeZone,
                ...(attendee.language != null && { language: attendee.language }),
                absent: attendee.absent,
                ...(attendee.phoneNumber != null && { phoneNumber: attendee.phoneNumber }),
                ...(attendee.seatUid != null && { seatUid: attendee.seatUid }),
                ...(attendee.createdAt != null && { createdAt: attendee.createdAt }),
                ...(attendee.metadata != null && { metadata: attendee.metadata }),
                ...(attendee.bookingFieldsResponses != null && { bookingFieldsResponses: attendee.bookingFieldsResponses })
            })) ?? [],
        ...(booking.guests != null && { guests: booking.guests }),
        ...(booking.metadata != null && { metadata: booking.metadata }),
        ...(booking.bookingFieldsResponses != null && { bookingFieldsResponses: booking.bookingFieldsResponses })
    };
}

const sync = createSync({
    description: 'Sync bookings from Cal.com',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Booking: BookingSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint != null ? CheckpointSchema.parse(rawCheckpoint) : { updated_after: '', cursor: '' };
        let updatedAfter = checkpoint.updated_after || undefined;
        let cursor: string | undefined = checkpoint.cursor || undefined;
        // Snapshot "now" so a final page whose bookings all lack `updatedAt` still
        // advances the watermark, instead of repeating the same window forever.
        const runStartedAt = new Date().toISOString();

        const proxyConfig: ProxyConfiguration = {
            // https://cal.com/docs/api-reference/v2/bookings/get-all-bookings
            endpoint: '/bookings',
            headers: {
                'cal-api-version': '2026-05-01'
            },
            params: {
                sortUpdatedAt: 'asc',
                ...(updatedAfter != null && { afterUpdatedAt: updatedAfter }),
                ...(cursor != null && { cursor })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'pagination.nextCursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        // https://cal.com/docs/api-reference/v2/bookings/get-all-bookings
        for await (const page of nango.paginate(proxyConfig)) {
            const bookings: z.infer<typeof ProviderBookingSchema>[] = [];
            for (const raw of page) {
                const parsed = ProviderBookingSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse booking: ${parsed.error.message}`);
                }
                bookings.push(parsed.data);
            }

            const mapped = bookings.map(mapBooking);

            if (mapped.length === 0) {
                continue;
            }

            await nango.batchSave(mapped, 'Booking');

            if (cursor !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter ?? '',
                    cursor
                });
                continue;
            }

            let maxUpdatedAt: string | undefined;
            for (const booking of bookings) {
                if (booking.updatedAt != null && (maxUpdatedAt == null || booking.updatedAt > maxUpdatedAt)) {
                    maxUpdatedAt = booking.updatedAt;
                }
            }
            updatedAfter = maxUpdatedAt ?? runStartedAt;
            await nango.saveCheckpoint({
                updated_after: updatedAfter ?? '',
                cursor: ''
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
