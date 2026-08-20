import { z } from 'zod';
import { createAction } from 'nango';

const AttendeeInputSchema = z.object({
    name: z.string().describe('The name of the attendee'),
    timeZone: z.string().describe('The time zone of the attendee (e.g., America/New_York)'),
    email: z.string().optional().describe('The email of the attendee'),
    phoneNumber: z.string().optional().describe('The phone number of the attendee in international format (e.g., +19876543210)'),
    language: z.string().optional().describe('The preferred language of the attendee for booking confirmation')
});

const LocationInputSchema = z
    .union([
        z.object({ type: z.literal('address').describe('Location type: address defined by the organizer') }).describe('Address defined by the organizer'),
        z
            .object({
                type: z.literal('attendeeAddress').describe('Location type: address provided by the attendee'),
                address: z.string().describe('Address provided by the attendee')
            })
            .describe('Attendee-provided address location'),
        z
            .object({
                type: z.literal('attendeeDefined').describe('Location type: location defined by the attendee'),
                location: z.string().describe('Location defined by the attendee')
            })
            .describe('Attendee-defined location'),
        z
            .object({
                type: z.literal('attendeePhone').describe('Location type: phone location provided by the attendee'),
                phone: z.string().describe('Phone number provided by the attendee')
            })
            .describe('Attendee phone location'),
        z
            .object({
                type: z.literal('integration').describe('Location type: integration-defined location'),
                integration: z.string().describe('Video conferencing integration (e.g., cal-video, zoom, google-meet)')
            })
            .describe('Integration-defined location'),
        z.object({ type: z.literal('link').describe('Location type: link defined by the organizer') }).describe('Link defined by the organizer'),
        z.object({ type: z.literal('phone').describe('Location type: phone defined by the organizer') }).describe('Phone defined by the organizer'),
        z
            .object({ type: z.literal('organizersDefaultApp').describe('Location type: default app defined by the organizer') })
            .describe('Default app defined by the organizer (team events only)')
    ])
    .optional();

const RoutingInputSchema = z
    .object({
        responseId: z.number().optional().describe('The ID of the routing form response'),
        teamMemberIds: z.array(z.number()).describe('Array of team member IDs routed to handle this booking'),
        teamMemberEmail: z.string().optional().describe('The email of the team member assigned to handle this booking'),
        skipContactOwner: z.boolean().optional().describe('Whether to skip contact owner assignment from CRM integration'),
        crmAppSlug: z.string().optional().describe('The CRM application slug for integration'),
        crmOwnerRecordType: z.string().optional().describe('The CRM owner record type for contact assignment'),
        crmRecordOwnerFallbackTeamMemberIds: z.array(z.number()).optional().describe('Eligible CRM owner fallback team member IDs'),
        crmRecordOwnerFallbackMode: z.enum(['relationship', 'attributeRules']).optional().describe('The CRM owner fallback strategy')
    })
    .optional();

const InputSchema = z
    .object({
        start: z.string().describe('The start time of the booking in ISO 8601 format in UTC timezone (e.g., 2024-08-13T09:00:00Z)'),
        attendee: AttendeeInputSchema.describe('The attendee details'),
        eventTypeId: z.number().optional().describe('The ID of the event type to book. Required unless eventTypeSlug and username are provided.'),
        eventTypeSlug: z.string().optional().describe('The slug of the event type. Required along with username or teamSlug if eventTypeId is not provided.'),
        username: z.string().optional().describe('The username of the event owner. Required with eventTypeSlug if eventTypeId is not provided.'),
        teamSlug: z.string().optional().describe('The team slug for team event types. Required with eventTypeSlug if eventTypeId is not provided.'),
        organizationSlug: z.string().optional().describe('The organization slug. Only used when booking with eventTypeSlug and username or teamSlug.'),
        guests: z.array(z.string()).optional().describe('An optional list of guest emails attending the event'),
        location: LocationInputSchema.describe('One of the event type locations. Overrides the default event type location.'),
        metadata: z.record(z.string(), z.string()).optional().describe('Additional metadata. Maximum 50 keys, 40 chars per key, 500 chars per value.'),
        lengthInMinutes: z.number().optional().describe('Desired booking length in minutes. Uses event type default if not provided.'),
        bookingFieldsResponses: z.record(z.string(), z.unknown()).optional().describe('Custom booking field responses keyed by field slug'),
        routing: RoutingInputSchema.describe('Routing information from routing forms'),
        emailVerificationCode: z.string().optional().describe('Email verification code required when event type has email verification enabled'),
        allowConflicts: z.boolean().optional().describe('When true and authenticated user is a host, availability conflict checks are bypassed'),
        allowBookingOutOfBounds: z.boolean().optional().describe('When true and authenticated user is a host, booking time out-of-bounds checks are bypassed'),
        skipBookingLimits: z.boolean().optional().describe('When true and authenticated user is a host, booking limit checks are bypassed'),
        instant: z.boolean().optional().describe('Flag indicating if the booking is an instant booking. Only available for team events.'),
        recurrenceCount: z.number().optional().describe('The number of recurrences for recurring event types. Uses event type default if not provided.')
    })
    .describe('Input to create a booking in Cal.com');

const ProviderAttendeeSchema = z.object({
    name: z.string(),
    email: z.string(),
    displayEmail: z.string().optional(),
    timeZone: z.string().optional(),
    language: z.string().optional(),
    phoneNumber: z.string().optional(),
    noShow: z.boolean().optional()
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
    description: z.string().optional(),
    status: z.enum(['cancelled', 'accepted', 'rejected', 'pending']),
    start: z.string(),
    end: z.string(),
    duration: z.number(),
    eventTypeId: z.number().optional(),
    eventType: ProviderEventTypeSchema,
    location: z.string().optional(),
    absentHost: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    rating: z.number().nullable().optional(),
    icsUid: z.string().optional(),
    attendees: z.array(ProviderAttendeeSchema).optional(),
    guests: z.array(z.string()).optional(),
    hosts: z.array(ProviderHostSchema).optional(),
    bookingFieldsResponses: z.record(z.string(), z.unknown()).optional(),
    recurringBookingUid: z.string().optional(),
    seatUid: z.string().optional()
});

const ProviderResponseSchema = z.object({
    status: z.enum(['success', 'error']),
    data: z.unknown().optional()
});

const HostSchema = z.object({
    id: z.number().describe('Host user ID'),
    name: z.string().describe('Host name'),
    email: z.string().describe('Host email'),
    displayEmail: z.string().optional().describe('Clean email for display purposes'),
    username: z.string().optional().describe('Host username'),
    timeZone: z.string().optional().describe('Host timezone')
});

const EventTypeSchema = z.object({
    id: z.number().describe('The event type ID'),
    slug: z.string().describe('The event type slug')
});

const AttendeeOutputSchema = z.object({
    name: z.string().describe('Attendee name'),
    email: z.string().describe('Attendee email'),
    displayEmail: z.string().optional().describe('Display email for the attendee'),
    timeZone: z.string().optional().describe('Attendee timezone'),
    language: z.string().optional().describe('Attendee preferred language'),
    phoneNumber: z.string().optional().describe('Attendee phone number'),
    noShow: z.boolean().optional().describe('Whether the attendee was marked as no-show')
});

const BookingOutputSchema = z.object({
    id: z.number().describe('The booking ID'),
    uid: z.string().describe('The unique booking identifier'),
    title: z.string().describe('The booking title'),
    description: z.string().optional().describe('The booking description'),
    status: z.enum(['cancelled', 'accepted', 'rejected', 'pending']).describe('The booking status'),
    start: z.string().describe('The start time in ISO 8601 format'),
    end: z.string().describe('The end time in ISO 8601 format'),
    duration: z.number().describe('The booking duration in minutes'),
    location: z.string().optional().describe('The meeting location or URL'),
    absentHost: z.boolean().describe('Whether the host was absent'),
    createdAt: z.string().describe('The creation time in ISO 8601 format'),
    updatedAt: z.string().nullable().describe('The last update time in ISO 8601 format'),
    metadata: z.record(z.string(), z.string()).optional().describe('Additional metadata stored with the booking'),
    eventType: EventTypeSchema.describe('The event type details'),
    attendees: z.array(AttendeeOutputSchema).describe('The list of attendees'),
    guests: z.array(z.string()).optional().describe('Guest emails attending the event'),
    hosts: z.array(HostSchema).describe('The list of hosts'),
    recurringBookingUid: z.string().optional().describe('UID for recurring bookings'),
    seatUid: z.string().optional().describe('UID for seated bookings'),
    icsUid: z.string().optional().describe('UID of the ICS calendar event'),
    bookingFieldsResponses: z.record(z.string(), z.unknown()).optional().describe('Custom booking field responses')
});

const OutputSchema = z
    .object({
        status: z.enum(['success', 'error']).describe('Response status from the provider'),
        data: z.union([BookingOutputSchema, z.array(BookingOutputSchema)]).describe('The created booking or array of recurring bookings')
    })
    .describe('Output of a created Cal.com booking');

/**
 * @tags: [write]
 * @tagReason: Creates a new booking in the provider's calendar system.
 * @pitfalls: Booking type (regular/recurring/instant) is determined solely by the event type configuration, not by an explicit parameter. Start must be UTC without timezone offset. attendee.phoneNumber is required for event types with SMS reminders. allowConflicts, allowBookingOutOfBounds, and skipBookingLimits are silently ignored when the caller is not a host.
 */
const action = createAction({
    description: 'Create a booking in Cal.com',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['BOOKING_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://cal.com/docs/api-reference/v2/bookings/create-a-booking
        const response = await nango.post({
            endpoint: '/bookings',
            headers: {
                'cal-api-version': '2026-02-25'
            },
            data: {
                start: input.start,
                attendee: input.attendee,
                ...(input.eventTypeId !== undefined && { eventTypeId: input.eventTypeId }),
                ...(input.eventTypeSlug !== undefined && { eventTypeSlug: input.eventTypeSlug }),
                ...(input.username !== undefined && { username: input.username }),
                ...(input.teamSlug !== undefined && { teamSlug: input.teamSlug }),
                ...(input.organizationSlug !== undefined && { organizationSlug: input.organizationSlug }),
                ...(input.guests !== undefined && { guests: input.guests }),
                ...(input.location !== undefined && { location: input.location }),
                ...(input.metadata !== undefined && { metadata: input.metadata }),
                ...(input.lengthInMinutes !== undefined && { lengthInMinutes: input.lengthInMinutes }),
                ...(input.bookingFieldsResponses !== undefined && { bookingFieldsResponses: input.bookingFieldsResponses }),
                ...(input.routing !== undefined && { routing: input.routing }),
                ...(input.emailVerificationCode !== undefined && { emailVerificationCode: input.emailVerificationCode }),
                ...(input.allowConflicts !== undefined && { allowConflicts: input.allowConflicts }),
                ...(input.allowBookingOutOfBounds !== undefined && { allowBookingOutOfBounds: input.allowBookingOutOfBounds }),
                ...(input.skipBookingLimits !== undefined && { skipBookingLimits: input.skipBookingLimits }),
                ...(input.instant !== undefined && { instant: input.instant }),
                ...(input.recurrenceCount !== undefined && { recurrenceCount: input.recurrenceCount })
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.status !== 'success') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned an error status when creating the booking.'
            });
        }

        const normalizeBooking = (booking: z.infer<typeof ProviderBookingSchema>) => ({
            id: booking.id,
            uid: booking.uid,
            title: booking.title,
            description: booking.description,
            status: booking.status,
            start: booking.start,
            end: booking.end,
            duration: booking.duration,
            location: booking.location,
            absentHost: booking.absentHost,
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt ?? null,
            metadata: booking.metadata,
            eventType: booking.eventType,
            attendees: booking.attendees ?? [],
            guests: booking.guests,
            hosts: booking.hosts ?? [],
            recurringBookingUid: booking.recurringBookingUid,
            seatUid: booking.seatUid,
            icsUid: booking.icsUid,
            bookingFieldsResponses: booking.bookingFieldsResponses
        });

        const bookingData = z.union([ProviderBookingSchema, z.array(ProviderBookingSchema)]).parse(providerResponse.data);
        const data = Array.isArray(bookingData) ? bookingData.map(normalizeBooking) : normalizeBooking(bookingData);

        return {
            status: providerResponse.status,
            data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
