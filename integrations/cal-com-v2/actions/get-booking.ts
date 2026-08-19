import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        bookingUid: z
            .string()
            .describe(
                'Unique identifier of the booking to retrieve. Can be a normal booking UID, a recurring booking recurrence UID, or a recurring booking UID.'
            )
    })
    .describe('Input parameters for retrieving a single booking.');

const EventTypeSchema = z
    .object({
        id: z.number().describe('Identifier of the event type.'),
        slug: z.string().describe('URL-friendly identifier of the event type.')
    })
    .describe('Event type associated with a booking.');

const BookingHostSchema = z
    .object({
        id: z.number().describe('Identifier of the host user.'),
        name: z.string().describe('Display name of the host.'),
        email: z.string().describe('Email address of the host.'),
        displayEmail: z.string().describe('Clean email address for display purposes.'),
        username: z.string().describe('Username of the host.'),
        timeZone: z.string().describe('Time zone of the host.')
    })
    .describe('Host of a booking.');

const AttendeeSchema = z
    .object({
        name: z.string().describe('Name of the attendee.'),
        email: z.string().describe('Email address of the attendee.'),
        displayEmail: z.string().describe('Clean email address for display purposes.'),
        timeZone: z.string().describe('Time zone of the attendee.'),
        language: z.string().optional().describe('Preferred language of the attendee.'),
        absent: z.boolean().describe('Whether the attendee is marked as absent.'),
        phoneNumber: z.string().optional().describe('Phone number of the attendee.'),
        seatUid: z.string().optional().describe('Unique identifier for the seat in a seated booking.'),
        createdAt: z.string().optional().describe('Date and time when the attendee joined the seated booking.'),
        bookingFieldsResponses: z.record(z.string(), z.unknown()).optional().describe('Booking field responses with field slugs as keys.'),
        metadata: z.record(z.string(), z.string()).optional().describe('Additional metadata for the attendee.')
    })
    .describe('Attendee of a booking.');

const BookingSchema = z
    .object({
        id: z.number().describe('Numeric identifier of the booking.'),
        uid: z.string().describe('Unique identifier of the booking.'),
        title: z.string().describe('Title of the booking.'),
        description: z.string().describe('Description of the booking.'),
        hosts: z.array(BookingHostSchema).describe('List of hosts for the booking.'),
        status: z.enum(['cancelled', 'accepted', 'rejected', 'pending']).describe('Current status of the booking.'),
        cancellationReason: z.string().optional().describe('Reason provided when the booking was cancelled.'),
        cancelledByEmail: z.string().optional().describe('Email of the user who cancelled the booking.'),
        reschedulingReason: z.string().optional().describe('Reason provided when the booking was rescheduled.'),
        rescheduledByEmail: z.string().optional().describe('Email of the user who rescheduled the booking.'),
        rescheduledFromUid: z.string().optional().describe('UID of the previous booking from which this booking was rescheduled.'),
        rescheduledToUid: z.string().optional().describe('UID of the new booking to which this booking was rescheduled.'),
        start: z.string().describe('Start date and time of the booking in ISO 8601 format.'),
        end: z.string().describe('End date and time of the booking in ISO 8601 format.'),
        duration: z.number().describe('Duration of the booking in minutes.'),
        eventTypeId: z.number().optional().describe('Deprecated identifier of the event type. Use eventType instead.'),
        eventType: EventTypeSchema.describe('Event type associated with the booking.'),
        meetingUrl: z.string().optional().describe('Deprecated meeting URL. Use location instead.'),
        location: z.string().describe('Meeting location or URL.'),
        absentHost: z.boolean().describe('Whether the host is marked as absent.'),
        createdAt: z.string().describe('Date and time when the booking was created.'),
        updatedAt: z.string().optional().describe('Date and time when the booking was last updated.'),
        metadata: z.record(z.string(), z.string()).optional().describe('Additional metadata for the booking.'),
        rating: z.number().optional().describe('Rating associated with the booking.'),
        icsUid: z.string().optional().describe('UID of the ICS calendar event.'),
        attendees: z.array(AttendeeSchema).describe('List of attendees for the booking.'),
        guests: z.array(z.string()).optional().describe('List of guest email addresses.'),
        bookingFieldsResponses: z.record(z.string(), z.unknown()).optional().describe('Booking field responses with field slugs as keys.'),
        recurringBookingUid: z.string().optional().describe('UID of the parent recurring booking for a recurrence.')
    })
    .describe('A booking from Cal.com.');

const OutputSchema = z.union([BookingSchema, z.array(BookingSchema)]).describe('A single booking or an array of recurring booking occurrences.');

type BookingOutput = z.infer<typeof BookingSchema>;

const ProviderEventTypeSchema = z.object({
    id: z.number(),
    slug: z.string()
});

const ProviderHostSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    displayEmail: z.string(),
    username: z.string(),
    timeZone: z.string()
});

const ProviderAttendeeSchema = z.object({
    name: z.string(),
    email: z.string(),
    displayEmail: z.string(),
    timeZone: z.string(),
    language: z.string().nullable().optional(),
    absent: z.boolean(),
    phoneNumber: z.string().nullable().optional()
});

const ProviderBookingSchema = z.object({
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
    eventTypeId: z.number().nullable().optional(),
    eventType: ProviderEventTypeSchema,
    meetingUrl: z.string().nullable().optional(),
    location: z.string(),
    absentHost: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.string()).nullable().optional(),
    rating: z.number().nullable().optional(),
    icsUid: z.string().nullable().optional(),
    attendees: z.array(ProviderAttendeeSchema),
    guests: z.array(z.string()).nullable().optional(),
    bookingFieldsResponses: z.record(z.string(), z.unknown()).nullable().optional(),
    recurringBookingUid: z.string().nullable().optional()
});

type ProviderBooking = z.infer<typeof ProviderBookingSchema>;

function mapBooking(raw: ProviderBooking): BookingOutput {
    return {
        id: raw.id,
        uid: raw.uid,
        title: raw.title,
        description: raw.description,
        hosts: raw.hosts.map((host) => ({
            id: host.id,
            name: host.name,
            email: host.email,
            displayEmail: host.displayEmail,
            username: host.username,
            timeZone: host.timeZone
        })),
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
        eventType: {
            id: raw.eventType.id,
            slug: raw.eventType.slug
        },
        ...(raw.meetingUrl != null && { meetingUrl: raw.meetingUrl }),
        location: raw.location,
        absentHost: raw.absentHost,
        createdAt: raw.createdAt,
        ...(raw.updatedAt != null && { updatedAt: raw.updatedAt }),
        ...(raw.metadata != null && { metadata: raw.metadata }),
        ...(raw.rating != null && { rating: raw.rating }),
        ...(raw.icsUid != null && { icsUid: raw.icsUid }),
        attendees: raw.attendees.map((attendee) => ({
            name: attendee.name,
            email: attendee.email,
            displayEmail: attendee.displayEmail,
            timeZone: attendee.timeZone,
            ...(attendee.language != null && { language: attendee.language }),
            absent: attendee.absent,
            ...(attendee.phoneNumber != null && { phoneNumber: attendee.phoneNumber })
        })),
        ...(raw.guests != null && { guests: raw.guests }),
        ...(raw.bookingFieldsResponses != null && { bookingFieldsResponses: raw.bookingFieldsResponses }),
        ...(raw.recurringBookingUid != null && { recurringBookingUid: raw.recurringBookingUid })
    };
}

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing booking from Cal.com without mutating provider state.
 * @pitfalls: Recurring booking UIDs return an array of occurrences rather than a single object; seated bookings may omit attendees unless the event type enables show-attendees or the caller has elevated permissions.
 */
const action = createAction({
    description: 'Retrieve a single booking from Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://cal.com/docs/api-reference/v2/bookings/get-a-booking
            endpoint: `/bookings/${encodeURIComponent(input.bookingUid)}`,
            headers: {
                'cal-api-version': '2026-02-25'
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            status: z.string(),
            data: z.unknown()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.status !== 'success') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com returned an error response.'
            });
        }

        if (Array.isArray(providerResponse.data)) {
            const items = providerResponse.data.map((item: unknown) => ProviderBookingSchema.parse(item));
            return items.map(mapBooking);
        }

        const single = ProviderBookingSchema.parse(providerResponse.data);
        return mapBooking(single);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
