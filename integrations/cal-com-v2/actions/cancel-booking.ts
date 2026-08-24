import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        bookingUid: z.string().describe('Unique identifier of the booking to cancel. Example: "abc123"'),
        cancellationReason: z.string().optional().describe('Optional reason for cancellation.'),
        cancelSubsequentBookings: z
            .boolean()
            .optional()
            .describe('For recurring non-seated bookings only. If true, cancels this recurrence and all subsequent ones.'),
        seatUid: z.string().optional().describe('For seated bookings only. UID of the specific seat to cancel.')
    })
    .describe('Input to cancel a Cal.com booking.');

const ProviderAttendeeSchema = z.object({
    name: z.string(),
    email: z.string(),
    displayEmail: z.string().optional(),
    timeZone: z.string(),
    language: z.string().optional(),
    absent: z.boolean().optional(),
    phoneNumber: z.string().optional()
});

const ProviderHostSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    displayEmail: z.string().optional(),
    username: z.string().optional(),
    timeZone: z.string().optional()
});

const ProviderEventTypeSchema = z.object({
    id: z.number(),
    slug: z.string()
});

const ProviderBookingSchema = z.object({
    id: z.number(),
    uid: z.string(),
    title: z.string(),
    description: z.string().optional().nullable(),
    hosts: z.array(ProviderHostSchema).optional().nullable(),
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
    eventTypeId: z.number().optional(),
    eventType: ProviderEventTypeSchema,
    meetingUrl: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    absentHost: z.boolean().optional(),
    createdAt: z.string(),
    updatedAt: z.string().optional().nullable(),
    metadata: z.record(z.string(), z.string()).optional().nullable(),
    rating: z.number().optional().nullable(),
    icsUid: z.string().optional().nullable(),
    attendees: z.array(ProviderAttendeeSchema),
    guests: z.array(z.string()).optional(),
    bookingFieldsResponses: z.record(z.string(), z.unknown()).optional()
});

const AttendeeOutputSchema = z.object({
    name: z.string().describe('Attendee name'),
    email: z.string().describe('Attendee email'),
    displayEmail: z.string().optional().describe('Clean email for display purposes'),
    timeZone: z.string().describe('Attendee time zone'),
    language: z.string().optional().describe('Attendee language code'),
    absent: z.boolean().optional().describe('Whether the attendee was marked absent')
});

const HostOutputSchema = z.object({
    id: z.number().describe('Host user ID'),
    name: z.string().describe('Host name'),
    email: z.string().describe('Host email'),
    displayEmail: z.string().optional().describe('Clean email for display purposes'),
    username: z.string().optional().describe('Host username'),
    timeZone: z.string().optional().describe('Host time zone')
});

const EventTypeOutputSchema = z.object({
    id: z.number().describe('Event type ID'),
    slug: z.string().describe('Event type slug')
});

const BookingOutputSchema = z.object({
    id: z.number().describe('Booking ID'),
    uid: z.string().describe('Booking unique identifier'),
    title: z.string().describe('Booking title'),
    description: z.string().optional().describe('Booking description'),
    status: z.enum(['cancelled', 'accepted', 'rejected', 'pending']).describe('Current booking status'),
    start: z.string().describe('Booking start time in ISO 8601 UTC format'),
    end: z.string().describe('Booking end time in ISO 8601 UTC format'),
    duration: z.number().describe('Duration in minutes'),
    eventType: EventTypeOutputSchema.describe('Event type details'),
    location: z.string().optional().describe('Meeting location or URL'),
    attendees: z.array(AttendeeOutputSchema).describe('List of attendees'),
    hosts: z.array(HostOutputSchema).optional().describe('List of hosts'),
    cancellationReason: z.string().optional().describe('Reason for cancellation'),
    cancelledByEmail: z.string().optional().describe('Email of the user who cancelled'),
    createdAt: z.string().describe('Booking creation time'),
    updatedAt: z.string().optional().describe('Last update time')
});

const OutputSchema = z
    .union([BookingOutputSchema, z.array(BookingOutputSchema)])
    .describe('Cancelled booking data. Returns a single booking for normal bookings or an array of recurring bookings when cancelSubsequentBookings is true.');

function normalizeAttendee(attendee: z.infer<typeof ProviderAttendeeSchema>): z.infer<typeof AttendeeOutputSchema> {
    return {
        name: attendee.name,
        email: attendee.email,
        ...(attendee.displayEmail != null && { displayEmail: attendee.displayEmail }),
        timeZone: attendee.timeZone,
        ...(attendee.language != null && { language: attendee.language }),
        ...(attendee.absent != null && { absent: attendee.absent })
    };
}

function normalizeHost(host: z.infer<typeof ProviderHostSchema>): z.infer<typeof HostOutputSchema> {
    return {
        id: host.id,
        name: host.name,
        email: host.email,
        ...(host.displayEmail != null && { displayEmail: host.displayEmail }),
        ...(host.username != null && { username: host.username }),
        ...(host.timeZone != null && { timeZone: host.timeZone })
    };
}

function normalizeBooking(providerBooking: z.infer<typeof ProviderBookingSchema>): z.infer<typeof BookingOutputSchema> {
    return {
        id: providerBooking.id,
        uid: providerBooking.uid,
        title: providerBooking.title,
        ...(providerBooking.description != null && { description: providerBooking.description }),
        status: providerBooking.status,
        start: providerBooking.start,
        end: providerBooking.end,
        duration: providerBooking.duration,
        eventType: providerBooking.eventType,
        ...(providerBooking.location != null && { location: providerBooking.location }),
        attendees: providerBooking.attendees.map(normalizeAttendee),
        ...(providerBooking.hosts != null && { hosts: providerBooking.hosts.map(normalizeHost) }),
        ...(providerBooking.cancellationReason != null && { cancellationReason: providerBooking.cancellationReason }),
        ...(providerBooking.cancelledByEmail != null && { cancelledByEmail: providerBooking.cancelledByEmail }),
        createdAt: providerBooking.createdAt,
        ...(providerBooking.updatedAt != null && { updatedAt: providerBooking.updatedAt })
    };
}

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently cancels a provider booking and notifies attendees.
 * @pitfalls: Cancelling an already-cancelled booking throws a provider error. Recurring seated bookings must be cancelled individually by bookingUid and seatUid; cancelSubsequentBookings only applies to non-seated recurring bookings.
 */
const action = createAction({
    description: 'Cancel a Cal.com booking.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['BOOKING_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch: The Nango SDK throws for non-2xx responses. Convert Cal.com's error
        // envelope into a structured ActionError instead of letting the raw error propagate.
        try {
            response = await nango.post({
                // https://cal.com/docs/api-reference/v2/bookings/cancel-a-booking
                endpoint: `/bookings/${encodeURIComponent(input.bookingUid)}/cancel`,
                data: {
                    ...(input.cancellationReason !== undefined && { cancellationReason: input.cancellationReason }),
                    ...(input.cancelSubsequentBookings !== undefined && { cancelSubsequentBookings: input.cancelSubsequentBookings }),
                    ...(input.seatUid !== undefined && { seatUid: input.seatUid })
                },
                headers: {
                    'cal-api-version': '2026-02-25'
                },
                retries: 10
            });
        } catch (err: unknown) {
            throw new nango.ActionError({
                type: 'cancel_failed',
                message: 'Provider returned an error status when cancelling the booking.',
                details: err instanceof Error ? err.message : String(err)
            });
        }

        const providerResponse = z
            .object({
                status: z.enum(['success', 'error']),
                data: z.unknown().optional()
            })
            .parse(response.data);

        if (providerResponse.status !== 'success') {
            throw new nango.ActionError({
                type: 'cancel_failed',
                message: 'Provider returned an error status when cancelling the booking.'
            });
        }

        const data = providerResponse.data;
        if (Array.isArray(data)) {
            const bookings = z.array(ProviderBookingSchema).parse(data);
            return bookings.map(normalizeBooking);
        }

        const booking = ProviderBookingSchema.parse(data);
        return normalizeBooking(booking);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
