import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Event type ID. Example: 6732810')
    })
    .describe('Input for retrieving a single Cal.com event type.');

const ProviderResponseSchema = z.object({
    status: z.string(),
    data: z
        .object({
            eventType: z.record(z.string(), z.unknown()).optional()
        })
        .passthrough()
        .optional()
});

const DisabledFlagSchema = z
    .union([z.boolean(), z.object({ disabled: z.boolean() }).passthrough()])
    .nullable()
    .optional();

function readDisabledFlag(value: z.infer<typeof DisabledFlagSchema>): boolean {
    if (typeof value === 'boolean') {
        return value;
    }
    return value?.disabled ?? false;
}

const EventTypeSchema = z
    .object({
        id: z.number().optional(),
        title: z.string().optional(),
        slug: z.string().optional(),
        description: z.string().nullable().optional(),
        lengthInMinutes: z.number().optional(),
        isInstantEvent: z.boolean().optional(),
        hidden: z.boolean().optional(),
        lockTimeZoneToggleOnBookingPage: z.boolean().optional(),
        requiresBookerEmailVerification: z.boolean().optional(),
        disableGuests: z.boolean().optional(),
        disableCancelling: DisabledFlagSchema,
        disableRescheduling: DisabledFlagSchema,
        minimumBookingNotice: z.number().optional(),
        beforeEventBuffer: z.number().optional(),
        afterEventBuffer: z.number().optional(),
        slotInterval: z.number().nullable().optional(),
        successRedirectUrl: z.string().nullable().optional(),
        forwardParamsSuccessRedirect: z.boolean().optional(),
        currency: z.string().optional(),
        price: z.number().optional(),
        locations: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
        bookingFields: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
        metadata: z.record(z.string(), z.unknown()).nullable().optional(),
        users: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
        scheduleId: z.number().nullable().optional(),
        teamId: z.number().nullable().optional(),
        destinationCalendar: z.record(z.string(), z.unknown()).nullable().optional(),
        seatsPerTimeSlot: z.number().nullable().optional(),
        seatsShowAvailabilityCount: z.boolean().nullable().optional(),
        recurrence: z.record(z.string(), z.unknown()).nullable().optional(),
        hideCalendarNotes: z.boolean().optional(),
        hideCalendarEventDetails: z.boolean().optional(),
        privateNoteEnabled: z.boolean().optional(),
        privateNoteMode: z.string().nullable().optional(),
        privateNoteTemplate: z.string().nullable().optional(),
        allowReschedulingCancelledBookings: z.boolean().optional(),
        allowReschedulingPastBookings: z.boolean().optional(),
        hideOrganizerEmail: z.boolean().optional(),
        showOptimizedSlots: z.boolean().optional(),
        offsetStart: z.number().optional(),
        onlyShowFirstAvailableSlot: z.boolean().optional(),
        eventTypeColor: z.record(z.string(), z.unknown()).nullable().optional(),
        bookingLimits: z.record(z.string(), z.unknown()).nullable().optional(),
        durationLimits: z.record(z.string(), z.unknown()).nullable().optional(),
        customReplyToEmail: z.string().nullable().optional(),
        useDestinationCalendarEmail: z.boolean().optional(),
        bookingUrl: z.string().optional(),
        ownerId: z.number().optional(),
        schedulingType: z.string().nullable().optional(),
        children: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
        hosts: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
        webhooks: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
        workflows: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
        calVideoSettings: z.record(z.string(), z.unknown()).nullable().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.number().describe('Event type ID.'),
        title: z.string().describe('Event type title.'),
        slug: z.string().describe('URL-friendly identifier.'),
        description: z.string().optional().describe('Description of the event type.'),
        lengthInMinutes: z.number().describe('Duration of the event in minutes.'),
        isInstantEvent: z.boolean().describe('Whether this is an instant event type.'),
        hidden: z.boolean().describe('Whether the event type is hidden from the booking page.'),
        lockTimeZoneToggleOnBookingPage: z.boolean().describe('Whether the time zone toggle is locked on the booking page.'),
        requiresBookerEmailVerification: z.boolean().describe('Whether booker email verification is required.'),
        disableGuests: z.boolean().describe('Whether guests are disabled for this event type.'),
        disableCancelling: z.boolean().describe('Whether cancelling is disabled.'),
        disableRescheduling: z.boolean().describe('Whether rescheduling is disabled.'),
        minimumBookingNotice: z.number().describe('Minimum minutes before the event that a booking can be made.'),
        beforeEventBuffer: z.number().describe('Extra minutes blocked before each meeting.'),
        afterEventBuffer: z.number().describe('Extra minutes blocked after each meeting.'),
        slotInterval: z.number().optional().describe('Minutes between each available slot.'),
        successRedirectUrl: z.string().optional().describe('URL to redirect to after a successful booking.'),
        forwardParamsSuccessRedirect: z.boolean().describe('Whether to forward query parameters to the success redirect URL.'),
        currency: z.string().describe('Currency for the event price.'),
        price: z.number().describe('Price of the event.'),
        locations: z.array(z.record(z.string(), z.unknown())).optional().describe('Locations where the event will take place.'),
        bookingFields: z.array(z.record(z.string(), z.unknown())).optional().describe('Custom fields shown on the booking form.'),
        metadata: z.record(z.string(), z.unknown()).optional().describe('Custom metadata for the event type.'),
        users: z.array(z.record(z.string(), z.unknown())).optional().describe('Users associated with this event type.'),
        scheduleId: z.number().optional().describe('ID of the schedule associated with this event type.'),
        teamId: z.number().optional().describe('Team ID if this is a team event type.'),
        destinationCalendar: z.record(z.string(), z.unknown()).optional().describe('Destination calendar configuration.'),
        seatsPerTimeSlot: z.number().optional().describe('Number of seats available per time slot.'),
        seatsShowAvailabilityCount: z.boolean().optional().describe('Whether to show the availability count for seats.'),
        recurrence: z.record(z.string(), z.unknown()).optional().describe('Recurring event configuration.'),
        hideCalendarNotes: z.boolean().describe('Whether calendar notes are hidden.'),
        hideCalendarEventDetails: z.boolean().describe('Whether calendar event details are hidden.'),
        privateNoteEnabled: z.boolean().describe('Whether private notes are enabled.'),
        privateNoteMode: z.string().optional().describe('How private notes are delivered.'),
        privateNoteTemplate: z.string().optional().describe('Template for private note content.'),
        allowReschedulingCancelledBookings: z.boolean().describe('Whether cancelled bookings can be rescheduled.'),
        allowReschedulingPastBookings: z.boolean().describe('Whether past bookings can be rescheduled.'),
        hideOrganizerEmail: z.boolean().describe('Whether the organizer email is hidden.'),
        showOptimizedSlots: z.boolean().describe('Whether to show optimized time slots.'),
        offsetStart: z.number().describe('Minutes to offset the start times shown to bookers.'),
        onlyShowFirstAvailableSlot: z.boolean().describe('Whether to show only the first available slot per day.'),
        eventTypeColor: z.record(z.string(), z.unknown()).optional().describe('Color configuration for the event type.'),
        bookingLimits: z.record(z.string(), z.unknown()).optional().describe('Limits on how many times this event can be booked.'),
        durationLimits: z.record(z.string(), z.unknown()).optional().describe('Limits on total booking duration.'),
        customReplyToEmail: z.string().optional().describe('Custom reply-to email address.'),
        useDestinationCalendarEmail: z.boolean().describe('Whether to use the destination calendar email.'),
        bookingUrl: z.string().describe('Full URL to the booking page for this event type.'),
        ownerId: z.number().describe('ID of the event type owner.'),
        schedulingType: z.string().optional().describe('Scheduling type for this event type.'),
        children: z.array(z.record(z.string(), z.unknown())).optional().describe('Child event types.'),
        hosts: z.array(z.record(z.string(), z.unknown())).optional().describe('Hosts assigned to this event type.'),
        webhooks: z.array(z.record(z.string(), z.unknown())).optional().describe('Configured webhooks for this event type.'),
        workflows: z.array(z.record(z.string(), z.unknown())).optional().describe('Configured workflows for this event type.'),
        calVideoSettings: z.record(z.string(), z.unknown()).optional().describe('Cal video settings for the event type.')
    })
    .describe('Output containing a single Cal.com event type.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single event type from Cal.com via a GET request.
 * @pitfalls: Only authorized users can retrieve an event type, and the provider returns disableCancelling and disableRescheduling as configuration objects that this action normalizes to plain booleans.
 */
const action = createAction({
    description: 'Retrieve a single event type from Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['EVENT_TYPE_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch: The Nango SDK throws for non-2xx responses. Cal.com returns 404 for
        // a non-existent event type, which we convert into a structured provider_error.
        try {
            response = await nango.get({
                // https://cal.com/docs/api-reference/v2/event-types
                endpoint: `/event-types/${encodeURIComponent(String(input.id))}`,
                headers: {
                    'cal-api-version': '2024-06-14'
                },
                retries: 3
            });
        } catch (err: unknown) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned an error status when retrieving the event type.',
                details: err instanceof Error ? err.message : String(err)
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.status !== 'success' || !providerResponse.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned an error status when retrieving the event type.'
            });
        }

        const rawData = providerResponse.data;
        const rawEventType = rawData.eventType;
        const eventType = rawEventType ? EventTypeSchema.parse(rawEventType) : EventTypeSchema.parse(rawData);

        return {
            id: eventType.id ?? 0,
            title: eventType.title ?? '',
            slug: eventType.slug ?? '',
            description: eventType.description ?? undefined,
            lengthInMinutes: eventType.lengthInMinutes ?? 0,
            isInstantEvent: eventType.isInstantEvent ?? false,
            hidden: eventType.hidden ?? false,
            lockTimeZoneToggleOnBookingPage: eventType.lockTimeZoneToggleOnBookingPage ?? false,
            requiresBookerEmailVerification: eventType.requiresBookerEmailVerification ?? false,
            disableGuests: eventType.disableGuests ?? false,
            disableCancelling: readDisabledFlag(eventType.disableCancelling),
            disableRescheduling: readDisabledFlag(eventType.disableRescheduling),
            minimumBookingNotice: eventType.minimumBookingNotice ?? 0,
            beforeEventBuffer: eventType.beforeEventBuffer ?? 0,
            afterEventBuffer: eventType.afterEventBuffer ?? 0,
            slotInterval: eventType.slotInterval ?? undefined,
            successRedirectUrl: eventType.successRedirectUrl ?? undefined,
            forwardParamsSuccessRedirect: eventType.forwardParamsSuccessRedirect ?? false,
            currency: eventType.currency ?? '',
            price: eventType.price ?? 0,
            locations: eventType.locations ?? undefined,
            bookingFields: eventType.bookingFields ?? undefined,
            metadata: eventType.metadata ?? undefined,
            users: eventType.users ?? undefined,
            scheduleId: eventType.scheduleId ?? undefined,
            teamId: eventType.teamId ?? undefined,
            destinationCalendar: eventType.destinationCalendar ?? undefined,
            seatsPerTimeSlot: eventType.seatsPerTimeSlot ?? undefined,
            seatsShowAvailabilityCount: eventType.seatsShowAvailabilityCount ?? undefined,
            recurrence: eventType.recurrence ?? undefined,
            hideCalendarNotes: eventType.hideCalendarNotes ?? false,
            hideCalendarEventDetails: eventType.hideCalendarEventDetails ?? false,
            privateNoteEnabled: eventType.privateNoteEnabled ?? false,
            privateNoteMode: eventType.privateNoteMode ?? undefined,
            privateNoteTemplate: eventType.privateNoteTemplate ?? undefined,
            allowReschedulingCancelledBookings: eventType.allowReschedulingCancelledBookings ?? false,
            allowReschedulingPastBookings: eventType.allowReschedulingPastBookings ?? false,
            hideOrganizerEmail: eventType.hideOrganizerEmail ?? false,
            showOptimizedSlots: eventType.showOptimizedSlots ?? false,
            offsetStart: eventType.offsetStart ?? 0,
            onlyShowFirstAvailableSlot: eventType.onlyShowFirstAvailableSlot ?? false,
            eventTypeColor: eventType.eventTypeColor ?? undefined,
            bookingLimits: eventType.bookingLimits ?? undefined,
            durationLimits: eventType.durationLimits ?? undefined,
            customReplyToEmail: eventType.customReplyToEmail ?? undefined,
            useDestinationCalendarEmail: eventType.useDestinationCalendarEmail ?? false,
            bookingUrl: eventType.bookingUrl ?? '',
            ownerId: eventType.ownerId ?? 0,
            schedulingType: eventType.schedulingType ?? undefined,
            children: eventType.children ?? undefined,
            hosts: eventType.hosts ?? undefined,
            webhooks: eventType.webhooks ?? undefined,
            workflows: eventType.workflows ?? undefined,
            calVideoSettings: eventType.calVideoSettings ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
