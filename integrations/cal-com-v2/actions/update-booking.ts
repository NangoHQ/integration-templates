import { z } from 'zod';
import { createAction } from 'nango';

const LocationAddressSchema = z.object({
    type: z.literal('address').describe('Location type identifier. Must be "address".'),
    address: z.string().describe('Physical address defined by the organizer.')
});

const LocationAttendeeAddressSchema = z.object({
    type: z.literal('attendeeAddress').describe('Location type identifier. Must be "attendeeAddress".'),
    address: z.string().describe('Physical address defined by the attendee.')
});

const LocationAttendeeDefinedSchema = z.object({
    type: z.literal('attendeeDefined').describe('Location type identifier. Must be "attendeeDefined".'),
    location: z.string().describe('Free-form location provided by the attendee.')
});

const LocationAttendeePhoneSchema = z.object({
    type: z.literal('attendeePhone').describe('Location type identifier. Must be "attendeePhone".'),
    phone: z.string().describe('Phone number of the attendee in international format.')
});

const LocationIntegrationSchema = z.object({
    type: z.literal('integration').describe('Location type identifier. Must be "integration".'),
    integration: z
        .enum([
            'cal-video',
            'google-meet',
            'zoom',
            'whereby-video',
            'whatsapp-video',
            'webex-video',
            'telegram-video',
            'tandem',
            'sylaps-video',
            'skype-video',
            'sirius-video',
            'signal-video',
            'shimmer-video',
            'salesroom-video',
            'roam-video',
            'riverside-video',
            'ping-video',
            'office365-video',
            'mirotalk-video',
            'jitsi',
            'jelly-video',
            'jelly-conferencing',
            'huddle',
            'facetime-video',
            'element-call-video',
            'eightxeight-video',
            'discord-video',
            'demodesk-video',
            'campfire-video'
        ])
        .describe('Integration identifier for the conferencing provider.')
});

const LocationLinkSchema = z.object({
    type: z.literal('link').describe('Location type identifier. Must be "link".'),
    link: z.string().describe('URL for the meeting link defined by the organizer.')
});

const LocationPhoneSchema = z.object({
    type: z.literal('phone').describe('Location type identifier. Must be "phone".'),
    phone: z.string().describe('Phone number defined by the organizer in international format.')
});

const InputSchema = z
    .object({
        bookingUid: z.string().describe('Unique identifier of the booking to update. Example: "abc123"'),
        location: z
            .union([
                LocationAddressSchema,
                LocationAttendeeAddressSchema,
                LocationAttendeeDefinedSchema,
                LocationAttendeePhoneSchema,
                LocationIntegrationSchema,
                LocationLinkSchema,
                LocationPhoneSchema
            ])
            .describe('New location for the booking.')
    })
    .describe('Input to update a booking location in Cal.com.');

const BookingHostSchema = z.object({
    id: z.number().describe('Numeric identifier of the host.'),
    name: z.string().describe('Name of the host.'),
    email: z.string().describe('Email address of the host.'),
    displayEmail: z.string().describe('Clean email for display purposes.'),
    username: z.string().describe('Username of the host.'),
    timeZone: z.string().describe('Time zone of the host.')
});

const EventTypeSchema = z.object({
    id: z.number().describe('Numeric identifier of the event type.'),
    slug: z.string().describe('Slug of the event type.')
});

const BookingAttendeeSchema = z.object({
    name: z.string().describe('Name of the attendee.'),
    email: z.string().describe('Email address of the attendee.'),
    displayEmail: z.string().describe('Clean email for display purposes.'),
    timeZone: z.string().describe('Time zone of the attendee.'),
    language: z.string().optional().describe('Preferred language of the attendee.'),
    absent: z.boolean().describe('Whether the attendee was marked absent.'),
    phoneNumber: z.string().optional().describe('Phone number of the attendee in international format.')
});

const ProviderBookingOutputSchema = z.object({
    id: z.number(),
    uid: z.string(),
    title: z.string(),
    description: z.string(),
    hosts: z.array(BookingHostSchema),
    status: z.enum(['cancelled', 'accepted', 'rejected', 'pending']),
    cancellationReason: z.string().nullable().optional(),
    cancelledByEmail: z.string().nullable().optional(),
    rescheduledByEmail: z.string().nullable().optional(),
    rescheduledFromUid: z.string().nullable().optional(),
    rescheduledToUid: z.string().nullable().optional(),
    start: z.string(),
    end: z.string(),
    duration: z.number(),
    eventTypeId: z.number(),
    eventType: EventTypeSchema,
    meetingUrl: z.string().optional(),
    location: z.string(),
    absentHost: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    rating: z.number().nullable().optional(),
    icsUid: z.string().optional(),
    attendees: z.array(BookingAttendeeSchema),
    guests: z.array(z.string()).optional(),
    bookingFieldsResponses: z.record(z.string(), z.unknown()).optional()
});

const ProviderResponseSchema = z.object({
    status: z.enum(['success', 'error']),
    data: ProviderBookingOutputSchema
});

const OutputSchema = z
    .object({
        id: z.number().describe('Numeric identifier of the booking.'),
        uid: z.string().describe('Unique identifier of the booking.'),
        title: z.string().describe('Title of the booking.'),
        description: z.string().describe('Description of the booking.'),
        hosts: z
            .array(
                z.object({
                    id: z.number().describe('Numeric identifier of the host.'),
                    name: z.string().describe('Name of the host.'),
                    email: z.string().describe('Email address of the host.'),
                    displayEmail: z.string().describe('Clean email for display purposes.'),
                    username: z.string().describe('Username of the host.'),
                    timeZone: z.string().describe('Time zone of the host.')
                })
            )
            .describe('List of hosts for the booking.'),
        status: z.enum(['cancelled', 'accepted', 'rejected', 'pending']).describe('Current status of the booking.'),
        cancellationReason: z.string().optional().describe('Reason for cancellation if the booking was cancelled.'),
        cancelledByEmail: z.string().optional().describe('Email of the user who cancelled the booking.'),
        rescheduledByEmail: z.string().optional().describe('Email of the user who rescheduled the booking.'),
        rescheduledFromUid: z.string().optional().describe('UID of the previous booking from which this booking was rescheduled.'),
        rescheduledToUid: z.string().optional().describe('UID of the new booking to which this booking was rescheduled.'),
        start: z.string().describe('Start time of the booking in ISO 8601 format.'),
        end: z.string().describe('End time of the booking in ISO 8601 format.'),
        duration: z.number().describe('Duration of the booking in minutes.'),
        eventTypeId: z.number().describe('Deprecated numeric identifier of the event type. Rely on eventType instead.'),
        eventType: z
            .object({
                id: z.number().describe('Numeric identifier of the event type.'),
                slug: z.string().describe('Slug of the event type.')
            })
            .describe('Event type associated with the booking.'),
        location: z.string().describe('Location of the booking.'),
        absentHost: z.boolean().describe('Whether the host was marked absent.'),
        createdAt: z.string().describe('Creation time of the booking in ISO 8601 format.'),
        updatedAt: z.string().optional().describe('Last update time of the booking in ISO 8601 format.'),
        metadata: z.record(z.string(), z.string()).optional().describe('Custom metadata stored on the booking.'),
        rating: z.number().optional().describe('Rating given to the booking.'),
        icsUid: z.string().optional().describe('UID of the ICS event.'),
        attendees: z
            .array(
                z.object({
                    name: z.string().describe('Name of the attendee.'),
                    email: z.string().describe('Email address of the attendee.'),
                    displayEmail: z.string().describe('Clean email for display purposes.'),
                    timeZone: z.string().describe('Time zone of the attendee.'),
                    language: z.string().optional().describe('Preferred language of the attendee.'),
                    absent: z.boolean().describe('Whether the attendee was marked absent.'),
                    phoneNumber: z.string().optional().describe('Phone number of the attendee in international format.')
                })
            )
            .describe('List of attendees for the booking.'),
        guests: z.array(z.string()).optional().describe('List of guest emails attending the event.'),
        bookingFieldsResponses: z.record(z.string(), z.unknown()).optional().describe('Booking field responses keyed by field slug.')
    })
    .describe('Updated booking details returned by Cal.com.');

/**
 * @tags: [write]
 * @tagReason: Mutates the booking location in Cal.com and notifies attendees by email.
 * @pitfalls: Only event owners, hosts, and admins may update locations; others receive 403. Integration locations are provisioned as conference links, so the returned location string differs from the input integration name.
 */
const action = createAction({
    description: 'Update a booking in Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['BOOKING_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://cal.com/docs/api-reference/v2/bookings/update-booking-location-for-an-existing-booking
            endpoint: `/bookings/${encodeURIComponent(input.bookingUid)}/location`,
            headers: {
                'cal-api-version': '2024-08-13'
            },
            data: {
                location: input.location
            },
            retries: 10
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.status === 'error') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Failed to update booking location.'
            });
        }

        const booking = parsed.data;

        return {
            id: booking.id,
            uid: booking.uid,
            title: booking.title,
            description: booking.description,
            hosts: booking.hosts,
            status: booking.status,
            ...(booking.cancellationReason != null && { cancellationReason: booking.cancellationReason }),
            ...(booking.cancelledByEmail != null && { cancelledByEmail: booking.cancelledByEmail }),
            ...(booking.rescheduledByEmail != null && { rescheduledByEmail: booking.rescheduledByEmail }),
            ...(booking.rescheduledFromUid != null && { rescheduledFromUid: booking.rescheduledFromUid }),
            ...(booking.rescheduledToUid != null && { rescheduledToUid: booking.rescheduledToUid }),
            start: booking.start,
            end: booking.end,
            duration: booking.duration,
            eventTypeId: booking.eventTypeId,
            eventType: booking.eventType,
            location: booking.location,
            absentHost: booking.absentHost,
            createdAt: booking.createdAt,
            ...(booking.updatedAt != null && { updatedAt: booking.updatedAt }),
            ...(booking.metadata !== undefined && { metadata: booking.metadata }),
            ...(booking.rating != null && { rating: booking.rating }),
            ...(booking.icsUid !== undefined && { icsUid: booking.icsUid }),
            attendees: booking.attendees,
            ...(booking.guests !== undefined && { guests: booking.guests }),
            ...(booking.bookingFieldsResponses !== undefined && { bookingFieldsResponses: booking.bookingFieldsResponses })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
