import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        bookingUid: z.string().describe('The UID of the booking to reschedule. Example: "booking_uid_123"'),
        start: z.string().describe('New start time in ISO 8601 format. Example: "2024-08-13T10:00:00Z"'),
        seatUid: z
            .string()
            .optional()
            .describe('UID of the specific seat to reschedule, required for seated bookings. Example: "3be561a9-31f1-4b8e-aefc-9d9a085f0dd1"'),
        rescheduledBy: z.string().optional().describe('Email of the person rescheduling the booking. Example: "user@example.com"'),
        reschedulingReason: z.string().optional().describe('Reason for rescheduling. Example: "User requested reschedule"'),
        emailVerificationCode: z
            .string()
            .optional()
            .describe('Email verification code required when event type has email verification enabled. Example: "123456"'),
        rescheduleWithSameHost: z
            .boolean()
            .optional()
            .describe(
                'For round-robin event types, true keeps the original host; false lets round robin pick from the whole team. Ignored for other event types.'
            ),
        allowConflicts: z.boolean().optional().describe('When true and the authenticated user is a host, availability conflict checks are bypassed.'),
        allowBookingOutOfBounds: z
            .boolean()
            .optional()
            .describe('When true and the authenticated user is a host, booking time out-of-bounds checks are bypassed.'),
        skipBookingLimits: z.boolean().optional().describe('When true and the authenticated user is a host, booking limit checks are bypassed.')
    })
    .describe('Input to reschedule an existing Cal.com booking to a new start time.');

const ProviderHostSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    displayEmail: z.string(),
    username: z.string(),
    timeZone: z.string()
});

const ProviderEventTypeSchema = z.object({
    id: z.number(),
    slug: z.string()
});

const ProviderAttendeeSchema = z.object({
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

const ProviderBookingDataSchema = z.object({
    id: z.number(),
    uid: z.string(),
    title: z.string(),
    description: z.string(),
    hosts: z.array(ProviderHostSchema),
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
    eventTypeId: z.number(),
    eventType: ProviderEventTypeSchema,
    location: z.string(),
    absentHost: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.string()).nullable().optional(),
    rating: z.number().nullable().optional(),
    icsUid: z.string().nullable().optional(),
    attendees: z.array(ProviderAttendeeSchema).optional(),
    guests: z.array(z.string()).optional(),
    bookingFieldsResponses: z.record(z.string(), z.unknown()).optional(),
    seatUid: z.string().optional(),
    recurringBookingUid: z.string().optional()
});

const ProviderResponseSchema = z.object({
    status: z.enum(['success', 'error']),
    data: z.unknown().optional()
});

const OutputHostSchema = z.object({
    id: z.number().describe('Host ID'),
    name: z.string().describe('Host name'),
    email: z.string().describe('Host email'),
    timeZone: z.string().describe('Host timezone')
});

const OutputEventTypeSchema = z.object({
    id: z.number().describe('Event type ID'),
    slug: z.string().describe('Event type slug')
});

const OutputAttendeeSchema = z.object({
    name: z.string().describe('Attendee name'),
    email: z.string().describe('Attendee email'),
    timeZone: z.string().describe('Attendee timezone'),
    absent: z.boolean().describe('Whether the attendee is marked absent'),
    seatUid: z.string().optional().describe('Seat UID for seated bookings')
});

const OutputSchema = z
    .object({
        id: z.number().describe('Booking ID'),
        uid: z.string().describe('Booking UID'),
        title: z.string().describe('Booking title'),
        status: z.string().describe('Booking status: cancelled, accepted, rejected, or pending'),
        start: z.string().describe('Booking start time in ISO 8601 format'),
        end: z.string().describe('Booking end time in ISO 8601 format'),
        duration: z.number().describe('Booking duration in minutes'),
        location: z.string().optional().describe('Meeting location or URL'),
        eventType: OutputEventTypeSchema.describe('Event type information'),
        hosts: z.array(OutputHostSchema).describe('Booking hosts'),
        attendees: z.array(OutputAttendeeSchema).describe('Booking attendees'),
        rescheduledFromUid: z.string().optional().describe('UID of the original booking that was rescheduled'),
        rescheduledToUid: z.string().optional().describe('UID of the new booking created by rescheduling'),
        reschedulingReason: z.string().optional().describe('Reason for rescheduling'),
        rescheduledByEmail: z.string().optional().describe('Email of the user who rescheduled'),
        seatUid: z.string().optional().describe('Seat UID for seated bookings'),
        recurringBookingUid: z.string().optional().describe('Recurring booking UID for recurring bookings'),
        metadata: z.record(z.string(), z.string()).optional().describe('Additional booking metadata')
    })
    .describe('The newly created booking after rescheduling, including the original booking reference.');

/**
 * @tags: [write, destructive]
 * @tagReason: Creates a new booking at the requested time and permanently cancels the original booking.
 * @pitfalls: Only accepted and pending bookings can be rescheduled. Rescheduling creates a new booking and cancels the original, so future reschedules must use the new UID. Permission flags like allowConflicts are silently ignored for non-host callers, and for confirmation-required events the owner email in rescheduledBy auto-confirms while other values leave it pending.
 */
const action = createAction({
    description: 'Reschedule a Cal.com booking.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['BOOKING_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody = {
            start: input.start,
            ...(input.seatUid !== undefined && { seatUid: input.seatUid }),
            ...(input.rescheduledBy !== undefined && { rescheduledBy: input.rescheduledBy }),
            ...(input.reschedulingReason !== undefined && { reschedulingReason: input.reschedulingReason }),
            ...(input.emailVerificationCode !== undefined && { emailVerificationCode: input.emailVerificationCode }),
            ...(input.rescheduleWithSameHost !== undefined && { rescheduleWithSameHost: input.rescheduleWithSameHost }),
            ...(input.allowConflicts !== undefined && { allowConflicts: input.allowConflicts }),
            ...(input.allowBookingOutOfBounds !== undefined && { allowBookingOutOfBounds: input.allowBookingOutOfBounds }),
            ...(input.skipBookingLimits !== undefined && { skipBookingLimits: input.skipBookingLimits })
        };

        let response;
        // @allowTryCatch: The Nango SDK throws for non-2xx responses. Convert Cal.com's error
        // envelope into a structured ActionError instead of letting the raw error propagate.
        try {
            response = await nango.post({
                // https://cal.com/docs/api-reference/v2/bookings/reschedule-a-booking
                endpoint: `/bookings/${encodeURIComponent(input.bookingUid)}/reschedule`,
                headers: {
                    'cal-api-version': '2026-02-25'
                },
                data: requestBody,
                retries: 10
            });
        } catch (err: unknown) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned an error status when rescheduling the booking.',
                details: err instanceof Error ? err.message : String(err)
            });
        }

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Provider returned an empty response'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.status !== 'success') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned an error status when rescheduling the booking.'
            });
        }

        const booking = ProviderBookingDataSchema.parse(providerResponse.data);

        return {
            id: booking.id,
            uid: booking.uid,
            title: booking.title,
            status: booking.status,
            start: booking.start,
            end: booking.end,
            duration: booking.duration,
            location: booking.location,
            eventType: {
                id: booking.eventType.id,
                slug: booking.eventType.slug
            },
            hosts: booking.hosts.map((host) => ({
                id: host.id,
                name: host.name,
                email: host.email,
                timeZone: host.timeZone
            })),
            attendees: (booking.attendees || []).map((attendee) => ({
                name: attendee.name,
                email: attendee.email,
                timeZone: attendee.timeZone,
                absent: attendee.absent,
                ...(attendee.seatUid != null && { seatUid: attendee.seatUid })
            })),
            ...(booking.rescheduledFromUid != null && { rescheduledFromUid: booking.rescheduledFromUid }),
            ...(booking.rescheduledToUid != null && { rescheduledToUid: booking.rescheduledToUid }),
            ...(booking.reschedulingReason != null && { reschedulingReason: booking.reschedulingReason }),
            ...(booking.rescheduledByEmail != null && { rescheduledByEmail: booking.rescheduledByEmail }),
            ...(booking.seatUid != null && { seatUid: booking.seatUid }),
            ...(booking.recurringBookingUid != null && { recurringBookingUid: booking.recurringBookingUid }),
            ...(booking.metadata != null && { metadata: booking.metadata })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
