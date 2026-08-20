import { z } from 'zod';
import { createAction } from 'nango';

const BookingHostSchema = z.object({
    id: z.number().describe('Host user ID. Example: 1'),
    name: z.string().describe('Host name. Example: Jane Doe'),
    email: z.string().describe('Host email address. Example: jane100@example.com'),
    displayEmail: z.string().describe('Clean email for display purposes. Example: jane100@example.com'),
    username: z.string().describe('Host username. Example: jane100'),
    timeZone: z.string().describe('Host time zone. Example: America/Los_Angeles')
});

const EventTypeSchema = z.object({
    id: z.number().describe('Event type ID. Example: 1'),
    slug: z.string().describe('Event type slug. Example: some-event')
});

const BookingAttendeeSchema = z.object({
    name: z.string().describe('Attendee name. Example: John Doe'),
    email: z.string().describe('Attendee email address. Example: john@example.com'),
    displayEmail: z.string().describe('Clean email for display purposes. Example: john@example.com'),
    timeZone: z.string().describe('Attendee time zone. Example: America/New_York'),
    language: z.string().optional().describe('Attendee preferred language. Example: en'),
    absent: z.boolean().describe('Whether the attendee was marked absent.'),
    phoneNumber: z.string().optional().describe('Attendee phone number in international format. Example: +1234567890'),
    seatUid: z.string().optional().describe('Unique identifier for the seat. Present for seated event attendees.'),
    createdAt: z.string().optional().describe('The date and time when the attendee joined the seated booking. Example: 2024-08-13T15:30:00Z'),
    bookingFieldsResponses: z.record(z.string(), z.unknown()).optional().describe('Custom booking field responses for this attendee keyed by field slug.'),
    metadata: z.record(z.string(), z.string()).optional().describe('Additional metadata stored on the attendee.')
});

const BookingSchema = z.object({
    id: z.number().describe('Booking ID. Example: 123'),
    uid: z.string().describe('Booking unique identifier. Example: booking_uid_123'),
    title: z.string().describe('Booking title. Example: Consultation'),
    description: z.string().describe('Booking description. Example: Learn how to integrate scheduling into marketplace.'),
    hosts: z.array(BookingHostSchema).describe('Array of hosts for this booking.'),
    status: z.enum(['cancelled', 'accepted', 'rejected', 'pending']).describe('Booking status.'),
    cancellationReason: z.string().optional().describe('Reason for cancellation.'),
    cancelledByEmail: z.string().optional().describe('Email of the user who cancelled the booking.'),
    reschedulingReason: z.string().optional().describe('Reason for rescheduling.'),
    rescheduledByEmail: z.string().optional().describe('Email of the user who rescheduled the booking.'),
    rescheduledFromUid: z.string().optional().describe('UID of the previous booking from which this booking was rescheduled.'),
    rescheduledToUid: z.string().optional().describe('UID of the new booking to which this booking was rescheduled.'),
    start: z.string().describe('Booking start time in ISO 8601 format. Example: 2024-08-13T15:30:00Z'),
    end: z.string().describe('Booking end time in ISO 8601 format. Example: 2024-08-13T16:30:00Z'),
    duration: z.number().describe('Booking duration in minutes. Example: 60'),
    eventTypeId: z.number().optional().describe('Deprecated. Use eventType.id instead.'),
    eventType: EventTypeSchema.describe('Event type associated with this booking.'),
    meetingUrl: z.string().optional().describe('Deprecated. Use location instead.'),
    location: z.string().describe('Meeting location or URL. Example: https://example.com/meeting'),
    absentHost: z.boolean().describe('Whether the host was marked absent.'),
    createdAt: z.string().describe('Booking creation time in ISO 8601 format. Example: 2024-08-13T15:30:00Z'),
    updatedAt: z.string().optional().describe('Last update time in ISO 8601 format. Example: 2024-08-13T15:30:00Z'),
    metadata: z.record(z.string(), z.string()).optional().describe('Additional metadata stored on the booking.'),
    rating: z.number().optional().describe('Booking rating.'),
    icsUid: z.string().optional().describe('UID of the ICS calendar event.'),
    attendees: z.array(BookingAttendeeSchema).describe('Array of attendees for this booking.'),
    guests: z.array(z.string()).optional().describe('Guest emails attending the event.'),
    bookingFieldsResponses: z.record(z.string(), z.unknown()).optional().describe('Custom booking field responses keyed by field slug.'),
    recurringBookingUid: z.string().optional().describe('UID of the parent recurring booking. Present for recurring booking instances.')
});

const PaginationSchema = z.object({
    nextCursor: z.string().nullable().describe('Opaque cursor to fetch the next page. null when hasMore is false.'),
    hasMore: z.boolean().describe('Whether more pages are available after this one.')
});

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        status: z
            .enum(['upcoming', 'recurring', 'past', 'cancelled', 'unconfirmed'])
            .optional()
            .describe('Filter bookings by a single status. Omit to walk all statuses.'),
        attendeeEmail: z.string().optional().describe('Filter bookings by the attendee email address.'),
        attendeeName: z.string().optional().describe('Filter bookings by the attendee name.'),
        bookingUid: z.string().optional().describe('Filter bookings by the booking UID.'),
        eventTypeIds: z.string().optional().describe('Filter by comma-separated event type IDs belonging to the user.'),
        eventTypeId: z.string().optional().describe('Filter by a single event type ID belonging to the user.'),
        teamsIds: z.string().optional().describe('Filter by comma-separated team IDs the user is part of.'),
        teamId: z.string().optional().describe('Filter by a single team ID the user is part of.'),
        afterStart: z.string().optional().describe('Filter bookings with start after this ISO 8601 date string.'),
        beforeEnd: z.string().optional().describe('Filter bookings with end before this ISO 8601 date string.'),
        afterCreatedAt: z.string().optional().describe('Filter bookings created after this ISO 8601 date string.'),
        beforeCreatedAt: z.string().optional().describe('Filter bookings created before this ISO 8601 date string.'),
        afterUpdatedAt: z.string().optional().describe('Filter bookings updated after this ISO 8601 date string.'),
        beforeUpdatedAt: z.string().optional().describe('Filter bookings updated before this ISO 8601 date string.'),
        sortStart: z.enum(['asc', 'desc']).optional().describe('Sort results by start time.'),
        sortEnd: z.enum(['asc', 'desc']).optional().describe('Sort results by end time.'),
        sortCreated: z.enum(['asc', 'desc']).optional().describe('Sort results by creation time.'),
        sortUpdatedAt: z.enum(['asc', 'desc']).optional().describe('Sort results by updated time.'),
        limit: z.number().int().min(1).max(100).optional().describe('Number of items to return per page. Default: 50, max: 100.')
    })
    .describe('Input for listing bookings from Cal.com.');

const OutputSchema = z
    .object({
        status: z.enum(['success', 'error']).describe('Response status.'),
        data: z.array(BookingSchema).describe('Array of booking objects.'),
        pagination: PaginationSchema.describe('Pagination metadata for cursor-based navigation.')
    })
    .describe('Output for listing bookings from Cal.com.');

const RawHostSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    displayEmail: z.string(),
    username: z.string(),
    timeZone: z.string()
});

const RawEventTypeSchema = z.object({
    id: z.number(),
    slug: z.string()
});

const RawAttendeeSchema = z.object({
    name: z.string(),
    email: z.string(),
    displayEmail: z.string(),
    timeZone: z.string(),
    language: z.string().nullable().optional(),
    absent: z.boolean(),
    phoneNumber: z.string().nullable().optional(),
    seatUid: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    bookingFieldsResponses: z.record(z.string(), z.unknown()).nullable().optional(),
    metadata: z.record(z.string(), z.string()).nullable().optional()
});

const RawBookingSchema = z.object({
    id: z.number(),
    uid: z.string(),
    title: z.string(),
    description: z.string(),
    hosts: z.array(RawHostSchema),
    status: z.enum(['cancelled', 'accepted', 'rejected', 'pending']),
    cancellationReason: z.string().nullable().optional(),
    cancelledByEmail: z.string().nullable().optional(),
    reschedulingReason: z.string().nullable().optional(),
    rescheduledByEmail: z.string().nullable().optional(),
    rescheduledFromUid: z.string().nullable().optional(),
    rescheduledToUid: z.string().nullable().optional(),
    start: z.string(),
    end: z.string(),
    duration: z.number(),
    eventTypeId: z.number().nullable().optional(),
    eventType: RawEventTypeSchema,
    meetingUrl: z.string().nullable().optional(),
    location: z.string(),
    absentHost: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.string()).nullable().optional(),
    rating: z.number().nullable().optional(),
    icsUid: z.string().nullable().optional(),
    attendees: z.array(RawAttendeeSchema).nullish(),
    guests: z.array(z.string()).nullable().optional(),
    bookingFieldsResponses: z.record(z.string(), z.unknown()).nullable().optional(),
    recurringBookingUid: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    status: z.enum(['success', 'error']),
    data: z.unknown().optional(),
    pagination: z
        .object({
            nextCursor: z.string().nullable(),
            hasMore: z.boolean()
        })
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Reads bookings from the Cal.com API without mutating provider data.
 * @pitfalls: Status accepts only one filter value per request; omitting it returns results backward from a far-future bound, while upcoming and recurring walk forward from the recent past. To list multiple statuses, merge parallel requests client-side.
 */
const action = createAction({
    description: 'List bookings from Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['BOOKING_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            ...(input.cursor !== undefined && { cursor: input.cursor }),
            ...(input.status !== undefined && { status: input.status }),
            ...(input.attendeeEmail !== undefined && { attendeeEmail: input.attendeeEmail }),
            ...(input.attendeeName !== undefined && { attendeeName: input.attendeeName }),
            ...(input.bookingUid !== undefined && { bookingUid: input.bookingUid }),
            ...(input.eventTypeIds !== undefined && { eventTypeIds: input.eventTypeIds }),
            ...(input.eventTypeId !== undefined && { eventTypeId: input.eventTypeId }),
            ...(input.teamsIds !== undefined && { teamsIds: input.teamsIds }),
            ...(input.teamId !== undefined && { teamId: input.teamId }),
            ...(input.afterStart !== undefined && { afterStart: input.afterStart }),
            ...(input.beforeEnd !== undefined && { beforeEnd: input.beforeEnd }),
            ...(input.afterCreatedAt !== undefined && { afterCreatedAt: input.afterCreatedAt }),
            ...(input.beforeCreatedAt !== undefined && { beforeCreatedAt: input.beforeCreatedAt }),
            ...(input.afterUpdatedAt !== undefined && { afterUpdatedAt: input.afterUpdatedAt }),
            ...(input.beforeUpdatedAt !== undefined && { beforeUpdatedAt: input.beforeUpdatedAt }),
            ...(input.sortStart !== undefined && { sortStart: input.sortStart }),
            ...(input.sortEnd !== undefined && { sortEnd: input.sortEnd }),
            ...(input.sortCreated !== undefined && { sortCreated: input.sortCreated }),
            ...(input.sortUpdatedAt !== undefined && { sortUpdatedAt: input.sortUpdatedAt }),
            ...(input.limit !== undefined && { limit: input.limit })
        };

        let response;
        // @allowTryCatch: The Nango SDK throws for non-2xx responses. Convert Cal.com's error
        // envelope into a structured ActionError instead of letting the raw error propagate.
        try {
            response = await nango.get({
                // https://cal.com/docs/api-reference/v2/bookings/get-all-bookings
                endpoint: '/bookings',
                params,
                headers: {
                    'cal-api-version': '2026-05-01'
                },
                retries: 3
            });
        } catch (err: unknown) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned a non-success status.',
                details: err instanceof Error ? err.message : String(err)
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.status !== 'success') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned a non-success status.'
            });
        }

        const rawBookings = z.array(RawBookingSchema).parse(parsed.data);

        const bookings = rawBookings.map((raw) => ({
            id: raw.id,
            uid: raw.uid,
            title: raw.title,
            description: raw.description,
            hosts: raw.hosts,
            status: raw.status,
            ...(raw.cancellationReason != null && { cancellationReason: raw.cancellationReason }),
            ...(raw.cancelledByEmail != null && { cancelledByEmail: raw.cancelledByEmail }),
            ...(raw.reschedulingReason != null && { reschedulingReason: raw.reschedulingReason }),
            ...(raw.rescheduledByEmail != null && { rescheduledByEmail: raw.rescheduledByEmail }),
            ...(raw.rescheduledFromUid != null && { rescheduledFromUid: raw.rescheduledFromUid }),
            ...(raw.rescheduledToUid != null && { rescheduledToUid: raw.rescheduledToUid }),
            start: raw.start,
            end: raw.end,
            duration: raw.duration,
            ...(raw.eventTypeId != null && { eventTypeId: raw.eventTypeId }),
            eventType: raw.eventType,
            ...(raw.meetingUrl != null && { meetingUrl: raw.meetingUrl }),
            location: raw.location,
            absentHost: raw.absentHost,
            createdAt: raw.createdAt,
            ...(raw.updatedAt != null && { updatedAt: raw.updatedAt }),
            ...(raw.metadata != null && { metadata: raw.metadata }),
            ...(raw.rating != null && { rating: raw.rating }),
            ...(raw.icsUid != null && { icsUid: raw.icsUid }),
            attendees: (raw.attendees ?? []).map((attendee) => ({
                name: attendee.name,
                email: attendee.email,
                displayEmail: attendee.displayEmail,
                timeZone: attendee.timeZone,
                absent: attendee.absent,
                ...(attendee.language != null && { language: attendee.language }),
                ...(attendee.phoneNumber != null && { phoneNumber: attendee.phoneNumber }),
                ...(attendee.seatUid != null && { seatUid: attendee.seatUid }),
                ...(attendee.createdAt != null && { createdAt: attendee.createdAt }),
                ...(attendee.bookingFieldsResponses != null && { bookingFieldsResponses: attendee.bookingFieldsResponses }),
                ...(attendee.metadata != null && { metadata: attendee.metadata })
            })),
            ...(raw.guests != null && { guests: raw.guests }),
            ...(raw.bookingFieldsResponses != null && { bookingFieldsResponses: raw.bookingFieldsResponses }),
            ...(raw.recurringBookingUid != null && { recurringBookingUid: raw.recurringBookingUid })
        }));

        return {
            status: parsed.status,
            data: bookings,
            pagination: {
                nextCursor: parsed.pagination?.nextCursor ?? null,
                hasMore: parsed.pagination?.hasMore ?? false
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
