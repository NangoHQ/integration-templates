import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the event type to update. Example: 123'),
        lengthInMinutes: z.number().optional().describe('Duration of the event in minutes. Example: 60'),
        title: z.string().optional().describe('Title of the event type. Example: "Learn the secrets of masterchief!"'),
        slug: z.string().optional().describe('URL-friendly identifier for the event type. Example: "learn-the-secrets-of-masterchief"'),
        description: z.string().optional().describe('Description shown on the booking page.'),
        disableGuests: z.boolean().optional().describe('If true, bookers cannot add guest emails.'),
        slotInterval: z.number().optional().describe('Length of each bookable slot in minutes. Defaults to the event length.'),
        minimumBookingNotice: z.number().optional().describe('Minimum minutes before the event that a booking can be made.'),
        beforeEventBuffer: z.number().optional().describe('Extra minutes blocked before the meeting starts.'),
        afterEventBuffer: z.number().optional().describe('Extra minutes blocked after the meeting ends.'),
        scheduleId: z.number().optional().describe('ID of a custom schedule to use instead of the default.'),
        hidden: z.boolean().optional().describe('If true, the event type is hidden from the booking page.'),
        successRedirectUrl: z.string().optional().describe('URL to redirect the booker to after a successful booking.'),
        customName: z.string().optional().describe('Customizable event name with valid variables.'),
        interfaceLanguage: z
            .string()
            .optional()
            .describe("Preferred language for the booking interface. Use an empty string for the visitor's browser language."),
        locations: z.array(z.object({}).passthrough()).optional().describe('Locations where the event will take place. Replaces all existing locations.'),
        bookingFields: z.array(z.object({}).passthrough()).optional().describe('Complete set of booking form fields. Replaces all existing booking fields.'),
        color: z.object({}).passthrough().optional().describe('Event type color settings.'),
        offsetStart: z.number().optional().describe('Offset timeslots shown to bookers by a specified number of minutes.'),
        onlyShowFirstAvailableSlot: z.boolean().optional().describe('Limit availability to one slot per day at the earliest time.'),
        requiresBookerEmailVerification: z.boolean().optional().describe('Require bookers to verify their email before booking.'),
        skipAttendeeEmailDeliverabilityCheck: z.boolean().optional().describe('Skip MX deliverability check for attendee emails.'),
        hideCalendarNotes: z.boolean().optional().describe('Hide notes from calendar events.'),
        lockTimeZoneToggleOnBookingPage: z.boolean().optional().describe('Lock the time zone toggle on the booking page.'),
        useDestinationCalendarEmail: z.boolean().optional().describe('Use the destination calendar email for notifications.'),
        hideCalendarEventDetails: z.boolean().optional().describe('Hide event details from the calendar.'),
        hideOrganizerEmail: z.boolean().optional().describe("Hide the organizer's email from the booking screen and notifications."),
        bookingRequiresAuthentication: z.boolean().optional().describe('Require authentication to book this event type via API.'),
        allowReschedulingPastBookings: z.boolean().optional().describe('Allow rescheduling of past events.'),
        allowReschedulingCancelledBookings: z.boolean().optional().describe('Allow creating a new booking when rescheduling a cancelled booking.'),
        showOptimizedSlots: z.boolean().optional().describe('Arrange time slots to optimize availability.'),
        privateNoteEnabled: z.boolean().optional().describe('Create a private note calendar event visible only to the host.'),
        privateNoteMode: z.string().optional().describe('How private notes are delivered: duplicate_event or separate_invites.'),
        privateNoteTemplate: z.string().optional().describe('Template for private note content.'),
        recurrence: z.object({}).passthrough().optional().describe('Recurring event type settings.'),
        seats: z.object({}).passthrough().optional().describe('Multi-seat event type settings.'),
        bookingLimitsCount: z.object({}).passthrough().optional().describe('Limit how many times this event can be booked.'),
        bookingLimitsDuration: z.object({}).passthrough().optional().describe('Limit total booking duration for this event type.'),
        bookingWindow: z.object({}).passthrough().optional().describe('Limit how far in the future this event can be booked.'),
        bookerLayouts: z.object({}).passthrough().optional().describe('Booker page layout settings.'),
        confirmationPolicy: z.object({}).passthrough().optional().describe('Manual confirmation policy settings.'),
        disableCancelling: z.object({}).passthrough().optional().describe('Settings for disabling cancellation.'),
        disableRescheduling: z.object({}).passthrough().optional().describe('Settings for disabling rescheduling.'),
        destinationCalendar: z.object({}).passthrough().optional().describe('Destination calendar settings.'),
        calVideoSettings: z.object({}).passthrough().optional().describe('Cal video settings for the event type.'),
        bookerActiveBookingsLimit: z.object({}).passthrough().optional().describe('Limit active bookings per booker.')
    })
    .describe('Input to update an existing Cal.com event type.');

const ProviderEventTypeSchema = z.object({
    id: z.number(),
    lengthInMinutes: z.number(),
    lengthInMinutesOptions: z.array(z.number()).optional(),
    title: z.string(),
    slug: z.string(),
    description: z.string().nullable().optional(),
    locations: z.array(z.object({}).passthrough()).optional(),
    bookingFields: z.array(z.object({}).passthrough()).optional(),
    disableGuests: z.boolean(),
    slotInterval: z.number().nullable().optional(),
    minimumBookingNotice: z.number(),
    beforeEventBuffer: z.number(),
    afterEventBuffer: z.number(),
    scheduleId: z.number().nullable().optional(),
    hidden: z.boolean(),
    successRedirectUrl: z.string().nullable().optional(),
    customName: z.string().optional(),
    bookingUrl: z.string(),
    ownerId: z.number(),
    recurrence: z.object({}).passthrough().nullable().optional(),
    metadata: z.object({}).passthrough().optional(),
    price: z.number().optional(),
    currency: z.string().optional(),
    seatsPerTimeSlot: z.number().nullable().optional(),
    seatsShowAvailabilityCount: z.boolean().nullable().optional(),
    seats: z.object({}).passthrough().nullable().optional(),
    bookingLimitsCount: z.object({}).passthrough().optional(),
    bookerActiveBookingsLimit: z.object({}).passthrough().optional(),
    onlyShowFirstAvailableSlot: z.boolean().optional(),
    bookingLimitsDuration: z.object({}).passthrough().optional(),
    bookingWindow: z.object({}).passthrough().optional(),
    bookerLayouts: z.object({}).passthrough().optional(),
    confirmationPolicy: z.object({}).passthrough().optional(),
    offsetStart: z.number().optional(),
    color: z.object({}).passthrough().optional(),
    destinationCalendar: z.object({}).passthrough().optional(),
    calVideoSettings: z.object({}).passthrough().optional(),
    disableCancelling: z.object({}).passthrough().optional(),
    disableRescheduling: z.object({}).passthrough().optional(),
    interfaceLanguage: z.string().nullable().optional(),
    privateNoteEnabled: z.boolean().optional(),
    privateNoteMode: z.string().nullable().optional(),
    privateNoteTemplate: z.string().nullable().optional(),
    allowReschedulingPastBookings: z.boolean().optional(),
    allowReschedulingCancelledBookings: z.boolean().nullable().optional(),
    showOptimizedSlots: z.boolean().nullable().optional(),
    requiresBookerEmailVerification: z.boolean().optional(),
    skipAttendeeEmailDeliverabilityCheck: z.boolean().optional(),
    hideCalendarNotes: z.boolean().optional(),
    lockTimeZoneToggleOnBookingPage: z.boolean().optional(),
    useDestinationCalendarEmail: z.boolean().optional(),
    hideCalendarEventDetails: z.boolean().optional(),
    hideOrganizerEmail: z.boolean().optional(),
    bookingRequiresAuthentication: z.boolean().optional(),
    isInstantEvent: z.boolean().optional(),
    forwardParamsSuccessRedirect: z.boolean().nullable().optional(),
    users: z.array(z.object({}).passthrough()).optional()
});

const ProviderResponseSchema = z.object({
    status: z.enum(['success', 'error']),
    data: ProviderEventTypeSchema
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the updated event type.'),
        lengthInMinutes: z.number().describe('Duration of the event in minutes.'),
        lengthInMinutesOptions: z.array(z.number()).optional().describe('Available event length options in minutes.'),
        title: z.string().describe('Title of the event type.'),
        slug: z.string().describe('URL-friendly identifier for the event type.'),
        description: z.string().optional().describe('Description shown on the booking page.'),
        locations: z.array(z.object({}).passthrough()).optional().describe('Locations where the event will take place.'),
        bookingFields: z.array(z.object({}).passthrough()).optional().describe('Custom fields shown on the booking form.'),
        disableGuests: z.boolean().describe('Whether guests are disabled for this event type.'),
        slotInterval: z.number().optional().describe('Length of each bookable slot in minutes.'),
        minimumBookingNotice: z.number().describe('Minimum minutes before the event that a booking can be made.'),
        beforeEventBuffer: z.number().describe('Extra minutes blocked before the meeting starts.'),
        afterEventBuffer: z.number().describe('Extra minutes blocked after the meeting ends.'),
        scheduleId: z.number().optional().describe('ID of the custom schedule used, if any.'),
        hidden: z.boolean().describe('Whether the event type is hidden from the booking page.'),
        successRedirectUrl: z.string().optional().describe('URL to redirect the booker to after a successful booking.'),
        customName: z.string().optional().describe('Customizable event name with valid variables.'),
        bookingUrl: z.string().describe('Full URL to the booking page for this event type.'),
        ownerId: z.number().describe('ID of the user who owns this event type.'),
        recurrence: z.object({}).passthrough().optional().describe('Recurring event type settings.'),
        metadata: z.object({}).passthrough().optional().describe('Additional metadata for the event type.'),
        price: z.number().optional().describe('Price for booking this event type.'),
        currency: z.string().optional().describe('Currency for the price.'),
        seatsPerTimeSlot: z.number().optional().describe('Number of seats available per time slot.'),
        seatsShowAvailabilityCount: z.boolean().optional().describe('Whether to show the remaining seat count.'),
        seats: z.object({}).passthrough().optional().describe('Multi-seat event type settings.'),
        bookingLimitsCount: z.object({}).passthrough().optional().describe('Limit how many times this event can be booked.'),
        bookerActiveBookingsLimit: z.object({}).passthrough().optional().describe('Limit active bookings per booker.'),
        onlyShowFirstAvailableSlot: z.boolean().optional().describe('Whether availability is limited to one slot per day.'),
        bookingLimitsDuration: z.object({}).passthrough().optional().describe('Limit total booking duration for this event type.'),
        bookingWindow: z.object({}).passthrough().optional().describe('Limit how far in the future this event can be booked.'),
        bookerLayouts: z.object({}).passthrough().optional().describe('Booker page layout settings.'),
        confirmationPolicy: z.object({}).passthrough().optional().describe('Manual confirmation policy settings.'),
        offsetStart: z.number().optional().describe('Offset timeslots shown to bookers by a specified number of minutes.'),
        color: z.object({}).passthrough().optional().describe('Event type color settings.'),
        destinationCalendar: z.object({}).passthrough().optional().describe('Destination calendar settings.'),
        calVideoSettings: z.object({}).passthrough().optional().describe('Cal video settings for the event type.'),
        disableCancelling: z.object({}).passthrough().optional().describe('Settings for disabling cancellation.'),
        disableRescheduling: z.object({}).passthrough().optional().describe('Settings for disabling rescheduling.'),
        interfaceLanguage: z.string().optional().describe('Preferred language for the booking interface.'),
        privateNoteEnabled: z.boolean().optional().describe('Whether a private note calendar event is created.'),
        privateNoteMode: z.string().optional().describe('How private notes are delivered.'),
        privateNoteTemplate: z.string().optional().describe('Template for private note content.'),
        allowReschedulingPastBookings: z.boolean().optional().describe('Whether past events can be rescheduled.'),
        allowReschedulingCancelledBookings: z.boolean().optional().describe('Whether rescheduling a cancelled booking creates a new booking.'),
        showOptimizedSlots: z.boolean().optional().describe('Whether time slots are arranged to optimize availability.'),
        requiresBookerEmailVerification: z.boolean().optional().describe('Whether bookers must verify their email.'),
        skipAttendeeEmailDeliverabilityCheck: z.boolean().optional().describe('Whether the MX deliverability check is skipped.'),
        hideCalendarNotes: z.boolean().optional().describe('Whether notes are hidden from calendar events.'),
        lockTimeZoneToggleOnBookingPage: z.boolean().optional().describe('Whether the time zone toggle is locked on the booking page.'),
        useDestinationCalendarEmail: z.boolean().optional().describe('Whether to use the destination calendar email.'),
        hideCalendarEventDetails: z.boolean().optional().describe('Whether event details are hidden from the calendar.'),
        hideOrganizerEmail: z.boolean().optional().describe('Whether the organizer email is hidden.'),
        bookingRequiresAuthentication: z.boolean().optional().describe('Whether API booking requires authentication.'),
        isInstantEvent: z.boolean().optional().describe('Whether this is an instant event type.'),
        forwardParamsSuccessRedirect: z.boolean().optional().describe('Whether to forward query parameters to the success redirect URL.'),
        users: z.array(z.object({}).passthrough()).optional().describe('Users associated with this event type.')
    })
    .describe('The updated Cal.com event type.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing event type via a PATCH request to the Cal.com API.
 * @pitfalls: The bookingFields array replaces all existing fields, so fetch the current event type first and resend every desired field. Locations can only use already-installed apps, and only Google Meet, Teams, and Zoom can be installed via API.
 */
const action = createAction({
    description: 'Update an event type in Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['EVENT_TYPE_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch: The Nango SDK throws for non-2xx responses. Convert Cal.com's error
        // envelope into a structured ActionError instead of letting the raw error propagate.
        try {
            // https://cal.com/docs/api-reference/v2/event-types
            response = await nango.patch({
                endpoint: `/event-types/${encodeURIComponent(input.id)}`,
                data: {
                    ...(input.lengthInMinutes !== undefined && { lengthInMinutes: input.lengthInMinutes }),
                    ...(input.title !== undefined && { title: input.title }),
                    ...(input.slug !== undefined && { slug: input.slug }),
                    ...(input.description !== undefined && { description: input.description }),
                    ...(input.disableGuests !== undefined && { disableGuests: input.disableGuests }),
                    ...(input.slotInterval !== undefined && { slotInterval: input.slotInterval }),
                    ...(input.minimumBookingNotice !== undefined && { minimumBookingNotice: input.minimumBookingNotice }),
                    ...(input.beforeEventBuffer !== undefined && { beforeEventBuffer: input.beforeEventBuffer }),
                    ...(input.afterEventBuffer !== undefined && { afterEventBuffer: input.afterEventBuffer }),
                    ...(input.scheduleId !== undefined && { scheduleId: input.scheduleId }),
                    ...(input.hidden !== undefined && { hidden: input.hidden }),
                    ...(input.successRedirectUrl !== undefined && { successRedirectUrl: input.successRedirectUrl }),
                    ...(input.customName !== undefined && { customName: input.customName }),
                    ...(input.interfaceLanguage !== undefined && { interfaceLanguage: input.interfaceLanguage }),
                    ...(input.locations !== undefined && { locations: input.locations }),
                    ...(input.bookingFields !== undefined && { bookingFields: input.bookingFields }),
                    ...(input.color !== undefined && { color: input.color }),
                    ...(input.offsetStart !== undefined && { offsetStart: input.offsetStart }),
                    ...(input.onlyShowFirstAvailableSlot !== undefined && { onlyShowFirstAvailableSlot: input.onlyShowFirstAvailableSlot }),
                    ...(input.requiresBookerEmailVerification !== undefined && { requiresBookerEmailVerification: input.requiresBookerEmailVerification }),
                    ...(input.skipAttendeeEmailDeliverabilityCheck !== undefined && {
                        skipAttendeeEmailDeliverabilityCheck: input.skipAttendeeEmailDeliverabilityCheck
                    }),
                    ...(input.hideCalendarNotes !== undefined && { hideCalendarNotes: input.hideCalendarNotes }),
                    ...(input.lockTimeZoneToggleOnBookingPage !== undefined && { lockTimeZoneToggleOnBookingPage: input.lockTimeZoneToggleOnBookingPage }),
                    ...(input.useDestinationCalendarEmail !== undefined && { useDestinationCalendarEmail: input.useDestinationCalendarEmail }),
                    ...(input.hideCalendarEventDetails !== undefined && { hideCalendarEventDetails: input.hideCalendarEventDetails }),
                    ...(input.hideOrganizerEmail !== undefined && { hideOrganizerEmail: input.hideOrganizerEmail }),
                    ...(input.bookingRequiresAuthentication !== undefined && { bookingRequiresAuthentication: input.bookingRequiresAuthentication }),
                    ...(input.allowReschedulingPastBookings !== undefined && { allowReschedulingPastBookings: input.allowReschedulingPastBookings }),
                    ...(input.allowReschedulingCancelledBookings !== undefined && {
                        allowReschedulingCancelledBookings: input.allowReschedulingCancelledBookings
                    }),
                    ...(input.showOptimizedSlots !== undefined && { showOptimizedSlots: input.showOptimizedSlots }),
                    ...(input.privateNoteEnabled !== undefined && { privateNoteEnabled: input.privateNoteEnabled }),
                    ...(input.privateNoteMode !== undefined && { privateNoteMode: input.privateNoteMode }),
                    ...(input.privateNoteTemplate !== undefined && { privateNoteTemplate: input.privateNoteTemplate }),
                    ...(input.recurrence !== undefined && { recurrence: input.recurrence }),
                    ...(input.seats !== undefined && { seats: input.seats }),
                    ...(input.bookingLimitsCount !== undefined && { bookingLimitsCount: input.bookingLimitsCount }),
                    ...(input.bookingLimitsDuration !== undefined && { bookingLimitsDuration: input.bookingLimitsDuration }),
                    ...(input.bookingWindow !== undefined && { bookingWindow: input.bookingWindow }),
                    ...(input.bookerLayouts !== undefined && { bookerLayouts: input.bookerLayouts }),
                    ...(input.confirmationPolicy !== undefined && { confirmationPolicy: input.confirmationPolicy }),
                    ...(input.disableCancelling !== undefined && { disableCancelling: input.disableCancelling }),
                    ...(input.disableRescheduling !== undefined && { disableRescheduling: input.disableRescheduling }),
                    ...(input.destinationCalendar !== undefined && { destinationCalendar: input.destinationCalendar }),
                    ...(input.calVideoSettings !== undefined && { calVideoSettings: input.calVideoSettings }),
                    ...(input.bookerActiveBookingsLimit !== undefined && { bookerActiveBookingsLimit: input.bookerActiveBookingsLimit })
                },
                headers: {
                    'cal-api-version': '2024-06-14'
                },
                retries: 1
            });
        } catch (err: unknown) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned an error status when updating the event type.',
                details: err instanceof Error ? err.message : String(err)
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The Cal.com API returned an unexpected response format.',
                details: parsed.error.issues
            });
        }

        if (parsed.data.status !== 'success') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com reported an error updating the event type.'
            });
        }

        const eventType = parsed.data.data;

        return {
            id: eventType.id,
            lengthInMinutes: eventType.lengthInMinutes,
            ...(eventType.lengthInMinutesOptions !== undefined && { lengthInMinutesOptions: eventType.lengthInMinutesOptions }),
            title: eventType.title,
            slug: eventType.slug,
            ...(eventType.description != null && { description: eventType.description }),
            ...(eventType.locations !== undefined && { locations: eventType.locations }),
            ...(eventType.bookingFields !== undefined && { bookingFields: eventType.bookingFields }),
            disableGuests: eventType.disableGuests,
            ...(eventType.slotInterval != null && { slotInterval: eventType.slotInterval }),
            minimumBookingNotice: eventType.minimumBookingNotice,
            beforeEventBuffer: eventType.beforeEventBuffer,
            afterEventBuffer: eventType.afterEventBuffer,
            ...(eventType.scheduleId != null && { scheduleId: eventType.scheduleId }),
            hidden: eventType.hidden,
            ...(eventType.successRedirectUrl != null && { successRedirectUrl: eventType.successRedirectUrl }),
            ...(eventType.customName !== undefined && { customName: eventType.customName }),
            bookingUrl: eventType.bookingUrl,
            ownerId: eventType.ownerId,
            ...(eventType.recurrence != null && { recurrence: eventType.recurrence }),
            ...(eventType.metadata !== undefined && { metadata: eventType.metadata }),
            ...(eventType.price !== undefined && { price: eventType.price }),
            ...(eventType.currency !== undefined && { currency: eventType.currency }),
            ...(eventType.seatsPerTimeSlot != null && { seatsPerTimeSlot: eventType.seatsPerTimeSlot }),
            ...(eventType.seatsShowAvailabilityCount != null && { seatsShowAvailabilityCount: eventType.seatsShowAvailabilityCount }),
            ...(eventType.seats != null && { seats: eventType.seats }),
            ...(eventType.bookingLimitsCount !== undefined && { bookingLimitsCount: eventType.bookingLimitsCount }),
            ...(eventType.bookerActiveBookingsLimit !== undefined && { bookerActiveBookingsLimit: eventType.bookerActiveBookingsLimit }),
            ...(eventType.onlyShowFirstAvailableSlot !== undefined && { onlyShowFirstAvailableSlot: eventType.onlyShowFirstAvailableSlot }),
            ...(eventType.bookingLimitsDuration !== undefined && { bookingLimitsDuration: eventType.bookingLimitsDuration }),
            ...(eventType.bookingWindow !== undefined && { bookingWindow: eventType.bookingWindow }),
            ...(eventType.bookerLayouts !== undefined && { bookerLayouts: eventType.bookerLayouts }),
            ...(eventType.confirmationPolicy !== undefined && { confirmationPolicy: eventType.confirmationPolicy }),
            ...(eventType.offsetStart !== undefined && { offsetStart: eventType.offsetStart }),
            ...(eventType.color !== undefined && { color: eventType.color }),
            ...(eventType.destinationCalendar !== undefined && { destinationCalendar: eventType.destinationCalendar }),
            ...(eventType.calVideoSettings !== undefined && { calVideoSettings: eventType.calVideoSettings }),
            ...(eventType.disableCancelling !== undefined && { disableCancelling: eventType.disableCancelling }),
            ...(eventType.disableRescheduling !== undefined && { disableRescheduling: eventType.disableRescheduling }),
            ...(eventType.interfaceLanguage != null && { interfaceLanguage: eventType.interfaceLanguage }),
            ...(eventType.privateNoteEnabled !== undefined && { privateNoteEnabled: eventType.privateNoteEnabled }),
            ...(eventType.privateNoteMode != null && { privateNoteMode: eventType.privateNoteMode }),
            ...(eventType.privateNoteTemplate != null && { privateNoteTemplate: eventType.privateNoteTemplate }),
            ...(eventType.allowReschedulingPastBookings !== undefined && { allowReschedulingPastBookings: eventType.allowReschedulingPastBookings }),
            ...(eventType.allowReschedulingCancelledBookings != null && { allowReschedulingCancelledBookings: eventType.allowReschedulingCancelledBookings }),
            ...(eventType.showOptimizedSlots != null && { showOptimizedSlots: eventType.showOptimizedSlots }),
            ...(eventType.requiresBookerEmailVerification !== undefined && { requiresBookerEmailVerification: eventType.requiresBookerEmailVerification }),
            ...(eventType.skipAttendeeEmailDeliverabilityCheck !== undefined && {
                skipAttendeeEmailDeliverabilityCheck: eventType.skipAttendeeEmailDeliverabilityCheck
            }),
            ...(eventType.hideCalendarNotes !== undefined && { hideCalendarNotes: eventType.hideCalendarNotes }),
            ...(eventType.lockTimeZoneToggleOnBookingPage !== undefined && { lockTimeZoneToggleOnBookingPage: eventType.lockTimeZoneToggleOnBookingPage }),
            ...(eventType.useDestinationCalendarEmail !== undefined && { useDestinationCalendarEmail: eventType.useDestinationCalendarEmail }),
            ...(eventType.hideCalendarEventDetails !== undefined && { hideCalendarEventDetails: eventType.hideCalendarEventDetails }),
            ...(eventType.hideOrganizerEmail !== undefined && { hideOrganizerEmail: eventType.hideOrganizerEmail }),
            ...(eventType.bookingRequiresAuthentication !== undefined && { bookingRequiresAuthentication: eventType.bookingRequiresAuthentication }),
            ...(eventType.isInstantEvent !== undefined && { isInstantEvent: eventType.isInstantEvent }),
            ...(eventType.forwardParamsSuccessRedirect != null && { forwardParamsSuccessRedirect: eventType.forwardParamsSuccessRedirect }),
            ...(eventType.users !== undefined && { users: eventType.users })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
