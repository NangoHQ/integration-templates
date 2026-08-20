import { z } from 'zod';
import { createAction } from 'nango';

const InputLocationSchema = z.union([
    z.object({
        type: z.literal('link').describe('Custom link location type.'),
        link: z.string().describe('The meeting link URL.'),
        public: z.boolean().optional().describe('Whether the link is publicly visible.')
    }),
    z.object({
        type: z.literal('address').describe('In-person address location type.'),
        address: z.string().describe('The address where the meeting will take place.'),
        public: z.boolean().optional().describe('Whether the address is publicly visible.')
    }),
    z.object({
        type: z.literal('integration').describe('Integrated conferencing app location type.'),
        integration: z.string().describe('Integration identifier, e.g. google-meet, zoom, office365-video, cal-video.')
    }),
    z.object({
        type: z.literal('phone').describe('Phone number location type.'),
        phone: z.string().describe('The phone number for the meeting.'),
        public: z.boolean().optional().describe('Whether the phone number is publicly visible.')
    }),
    z.object({
        type: z.literal('attendeeAddress').describe('Attendee provides the address location type.')
    }),
    z.object({
        type: z.literal('attendeePhone').describe('Attendee provides the phone number location type.')
    }),
    z.object({
        type: z.literal('attendeeDefined').describe('Attendee defines the location type.')
    })
]);

const InputColorSchema = z
    .object({
        lightThemeHex: z.string().describe('Color used for the event type in light theme. Example: "#292929".'),
        darkThemeHex: z.string().describe('Color used for the event type in dark theme. Example: "#fafafa".')
    })
    .optional();

const InputRecurrenceSchema = z
    .object({
        interval: z.number().describe('Repeats every N weeks, months, or years.'),
        occurrences: z.number().describe('Maximum number of recurring events.'),
        frequency: z.enum(['yearly', 'monthly', 'weekly']).describe('Recurrence frequency.'),
        disabled: z.boolean().optional().describe('Whether recurrence is disabled.')
    })
    .optional();

const InputSeatsSchema = z
    .union([
        z.object({
            seatsPerTimeSlot: z.number().describe('Number of seats available per time slot.'),
            showAttendeeInfo: z.boolean().describe('Show attendee information to other guests.'),
            showAvailabilityCount: z.boolean().describe('Display the count of available seats.'),
            disabled: z.boolean().optional().describe('Whether seats are disabled.')
        }),
        z.object({
            disabled: z.literal(true).describe('Disable seats for this event type.')
        })
    ])
    .optional();

const InputDestinationCalendarSchema = z
    .object({
        integration: z.string().describe('The integration type of the destination calendar.'),
        externalId: z.string().describe('The external ID of the destination calendar.')
    })
    .optional();

const InputDisableCancellingSchema = z
    .object({
        disabled: z.boolean().describe('If true, cancelling is always disabled for this event type.')
    })
    .optional();

const InputDisableReschedulingSchema = z
    .object({
        disabled: z.boolean().describe('If true, rescheduling is always disabled for this event type.'),
        minutesBefore: z.number().optional().describe('Disable rescheduling when less than the specified number of minutes before the meeting.')
    })
    .optional();

const InputBookerLayoutsSchema = z
    .object({
        defaultLayout: z.enum(['month', 'week', 'column']).describe('Default booking page layout.'),
        enabledLayouts: z.array(z.enum(['month', 'week', 'column'])).describe('Layouts the booker can choose from.')
    })
    .optional();

const InputConfirmationPolicySchema = z
    .union([
        z.object({
            type: z.enum(['always', 'time']).describe('When confirmation is required.'),
            noticeThreshold: z
                .object({
                    count: z.number().describe('Threshold count.'),
                    unit: z.enum(['minutes', 'hours', 'days', 'weeks', 'months', 'years']).describe('Threshold unit.')
                })
                .optional()
                .describe('Notice threshold before confirmation is needed. Required when type is time.'),
            blockUnconfirmedBookingsInBooker: z.boolean().describe('Unconfirmed bookings still block calendar slots.'),
            disabled: z.boolean().optional().describe('Whether confirmation policy is disabled.')
        }),
        z.object({
            disabled: z.literal(true).describe('Disable confirmation policy.')
        })
    ])
    .optional();

const InputBookingWindowSchema = z
    .union([
        z.object({
            type: z.literal('businessDays').describe('Business days window type.'),
            value: z.number().describe('Number of business days.'),
            rolling: z.boolean().optional().describe('Whether the window rolls forward.')
        }),
        z.object({
            type: z.literal('calendarDays').describe('Calendar days window type.'),
            value: z.number().describe('Number of calendar days.'),
            rolling: z.boolean().optional().describe('Whether the window rolls forward.')
        }),
        z.object({
            type: z.literal('range').describe('Fixed date range window type.'),
            start: z.string().describe('Start date of the range (ISO 8601).'),
            end: z.string().describe('End date of the range (ISO 8601).')
        }),
        z.object({
            disabled: z.literal(true).describe('Disable booking window.')
        })
    ])
    .optional();

const InputBookingLimitsCountSchema = z
    .union([
        z.object({
            disabled: z.literal(true).describe('Disable booking limits count.')
        }),
        z.object({
            PER_DAY: z.number().optional().describe('Maximum bookings per day.'),
            PER_WEEK: z.number().optional().describe('Maximum bookings per week.'),
            PER_MONTH: z.number().optional().describe('Maximum bookings per month.'),
            PER_YEAR: z.number().optional().describe('Maximum bookings per year.')
        })
    ])
    .optional();

const InputBookingLimitsDurationSchema = z
    .union([
        z.object({
            disabled: z.literal(true).describe('Disable booking limits duration.')
        }),
        z.object({
            PER_DAY: z.number().optional().describe('Maximum booking duration in minutes per day.'),
            PER_WEEK: z.number().optional().describe('Maximum booking duration in minutes per week.'),
            PER_MONTH: z.number().optional().describe('Maximum booking duration in minutes per month.'),
            PER_YEAR: z.number().optional().describe('Maximum booking duration in minutes per year.')
        })
    ])
    .optional();

const InputBookerActiveBookingsLimitSchema = z
    .union([
        z.object({
            enabled: z.boolean().describe('Whether the limit is enabled.'),
            limit: z.number().describe('Maximum number of active bookings a booker can have.')
        }),
        z.object({
            disabled: z.literal(true).describe('Disable booker active bookings limit.')
        })
    ])
    .optional();

const InputCalVideoSettingsSchema = z
    .object({
        disableRecordingForOrganizer: z.boolean().optional().describe('If true, the organizer cannot record the meeting.'),
        disableRecordingForGuests: z.boolean().optional().describe('If true, guests cannot record the meeting.'),
        redirectUrlOnExit: z.string().optional().describe('URL participants are redirected to when exiting the call.'),
        enableAutomaticRecordingForOrganizer: z.boolean().optional().describe('If true, automatic recording is enabled when the organizer joins.'),
        enableAutomaticTranscription: z.boolean().optional().describe('If true, automatic transcription is enabled when anyone joins.'),
        disableTranscriptionForGuests: z.boolean().optional().describe('If true, guests will not receive the transcription.'),
        disableTranscriptionForOrganizer: z.boolean().optional().describe('If true, the organizer will not receive the transcription.'),
        hideTranscriptionForGuests: z.boolean().optional().describe('If true, guests will not see live transcription captions.'),
        sendTranscriptionEmails: z.boolean().optional().describe('Send emails with the transcription after the meeting ends.'),
        disableAttendeeRecordingDownloadEmail: z.boolean().optional().describe('If true, attendees will not receive the recording download email.'),
        transcriptionLanguage: z.string().optional().describe('Deepgram language code for transcription.')
    })
    .optional();

const InputSchema = z
    .object({
        lengthInMinutes: z.number().describe('Duration of the event in minutes. Must be at least 1.'),
        lengthInMinutesOptions: z.array(z.number()).optional().describe('Alternative durations the booker can choose from. Must include lengthInMinutes.'),
        title: z.string().describe('Title of the event type. Example: "30 Minute Meeting".'),
        slug: z.string().describe('URL-friendly slug for the event type. Example: "30-min".'),
        description: z.string().optional().describe('Description of the event type.'),
        locations: z.array(InputLocationSchema).optional().describe('Locations where the event will take place.'),
        bookingFields: z.array(z.unknown()).optional().describe('Custom fields to collect from bookers during booking.'),
        disableGuests: z.boolean().optional().describe('If true, bookers cannot add guests via email.'),
        slotInterval: z.number().optional().describe('Length of each slot in minutes. Defaults to lengthInMinutes.'),
        minimumBookingNotice: z.number().optional().describe('Minimum minutes before the event that a booking can be made.'),
        beforeEventBuffer: z.number().optional().describe('Extra minutes blocked before the meeting starts.'),
        afterEventBuffer: z.number().optional().describe('Extra minutes blocked after the meeting ends.'),
        scheduleId: z.number().optional().describe('ID of a custom schedule to use instead of the default.'),
        bookingLimitsCount: InputBookingLimitsCountSchema.describe('Limit how many times this event can be booked.').optional(),
        bookerActiveBookingsLimit: InputBookerActiveBookingsLimitSchema.describe('Limit the number of active bookings a booker can make.').optional(),
        onlyShowFirstAvailableSlot: z.boolean().optional().describe('Limit availability to one slot per day at the earliest time.'),
        bookingLimitsDuration: InputBookingLimitsDurationSchema.describe('Limit total booking duration for this event.').optional(),
        bookingWindow: InputBookingWindowSchema.describe('Limit how far in the future this event can be booked.').optional(),
        offsetStart: z.number().optional().describe('Offset timeslots shown to bookers by this many minutes.'),
        bookerLayouts: InputBookerLayoutsSchema.describe('Booking page layouts available to the booker.').optional(),
        confirmationPolicy: InputConfirmationPolicySchema.describe('How bookings must be manually confirmed.').optional(),
        recurrence: InputRecurrenceSchema.describe('Recurring event type settings.').optional(),
        requiresBookerEmailVerification: z.boolean().optional().describe('Require booker email verification before booking.'),
        skipAttendeeEmailDeliverabilityCheck: z.boolean().optional().describe('Skip MX deliverability check for attendee emails.'),
        hideCalendarNotes: z.boolean().optional().describe('Hide calendar notes from the booking.'),
        lockTimeZoneToggleOnBookingPage: z.boolean().optional().describe('Lock the time zone toggle on the booking page.'),
        color: InputColorSchema.describe('Custom colors for the event type.').optional(),
        seats: InputSeatsSchema.describe('Multi-seat event type settings.').optional(),
        customName: z.string().optional().describe('Customizable event name with variables like {Event type title} and {Organiser}.'),
        destinationCalendar: InputDestinationCalendarSchema.describe('Destination calendar for bookings.').optional(),
        useDestinationCalendarEmail: z.boolean().optional().describe('Use the destination calendar email for the event.'),
        hideCalendarEventDetails: z.boolean().optional().describe('Hide calendar event details.'),
        successRedirectUrl: z.string().optional().describe('URL to redirect the booker to after a successful booking.'),
        hideOrganizerEmail: z.boolean().optional().describe('Hide the organizer email from the booking screen and notifications.'),
        calVideoSettings: InputCalVideoSettingsSchema.describe('Cal Video settings for the event type.').optional(),
        hidden: z.boolean().optional().describe('Hide the event type from the public profile.'),
        bookingRequiresAuthentication: z.boolean().optional().describe('Require authentication to book this event type via API.'),
        disableCancelling: InputDisableCancellingSchema.describe('Settings for disabling cancelling.').optional(),
        disableRescheduling: InputDisableReschedulingSchema.describe('Settings for disabling rescheduling.').optional(),
        interfaceLanguage: z.string().optional().describe('Preferred language for the booking interface. Use empty string for browser default.'),
        allowReschedulingPastBookings: z.boolean().optional().describe('Allow rescheduling of past bookings.'),
        allowReschedulingCancelledBookings: z.boolean().optional().describe('Allow creating a new booking when rescheduling a cancelled one.'),
        showOptimizedSlots: z.boolean().optional().describe('Arrange time slots to optimize availability.'),
        privateNoteEnabled: z.boolean().optional().describe('Create a private note calendar event visible only to the host.'),
        privateNoteMode: z.string().optional().describe('How private notes are delivered: duplicate_event or separate_invites.'),
        privateNoteTemplate: z.string().optional().describe('Template for private note content with variables.')
    })
    .describe('Input to create a new Cal.com event type.');

const OutputLocationSchema = z
    .object({
        type: z.string().describe('Location type.'),
        link: z.string().optional().describe('Meeting link URL.'),
        address: z.string().optional().describe('Meeting address.'),
        integration: z.string().optional().describe('Integration identifier.'),
        credentialId: z.number().optional().describe('Credential ID associated with the integration.'),
        phone: z.string().optional().describe('Phone number.'),
        public: z.boolean().optional().describe('Whether the location is publicly visible.')
    })
    .passthrough();

const OutputColorSchema = z.object({
    lightThemeHex: z.string().describe('Color used in light theme.'),
    darkThemeHex: z.string().describe('Color used in dark theme.')
});

const OutputRecurrenceSchema = z.object({
    interval: z.number().describe('Repeats every N weeks, months, or years.'),
    occurrences: z.number().describe('Maximum number of recurring events.'),
    frequency: z.enum(['yearly', 'monthly', 'weekly']).describe('Recurrence frequency.'),
    disabled: z.boolean().optional().describe('Whether recurrence is disabled.')
});

const OutputSeatsSchema = z.object({
    seatsPerTimeSlot: z.number().optional().describe('Number of seats per time slot.'),
    showAttendeeInfo: z.boolean().optional().describe('Show attendee information to other guests.'),
    showAvailabilityCount: z.boolean().optional().describe('Display available seat count.'),
    disabled: z.boolean().optional().describe('Whether seats are disabled.')
});

const OutputDestinationCalendarSchema = z.object({
    integration: z.string().describe('Integration type of the destination calendar.'),
    externalId: z.string().describe('External ID of the destination calendar.')
});

const OutputDisableCancellingSchema = z.object({
    disabled: z.boolean().describe('Whether cancelling is disabled.')
});

const OutputDisableReschedulingSchema = z.object({
    disabled: z.boolean().describe('Whether rescheduling is disabled.'),
    minutesBefore: z.number().optional().describe('Minutes before meeting when rescheduling is disabled.')
});

const OutputBookerLayoutsSchema = z.object({
    defaultLayout: z.enum(['month', 'week', 'column']).describe('Default booking page layout.'),
    enabledLayouts: z.array(z.enum(['month', 'week', 'column'])).describe('Enabled layouts.')
});

const OutputConfirmationPolicySchema = z.union([
    z.object({
        type: z.enum(['always', 'time']).describe('When confirmation is required.'),
        noticeThreshold: z
            .object({
                count: z.number().describe('Threshold count.'),
                unit: z.enum(['minutes', 'hours', 'days', 'weeks', 'months', 'years']).describe('Threshold unit.')
            })
            .optional()
            .describe('Notice threshold.'),
        blockUnconfirmedBookingsInBooker: z.boolean().describe('Unconfirmed bookings block calendar slots.'),
        disabled: z.boolean().optional().describe('Whether confirmation policy is disabled.')
    }),
    z.object({
        disabled: z.literal(true).describe('Confirmation policy is disabled.')
    })
]);

const OutputBookingWindowSchema = z.union([
    z.object({
        type: z.literal('businessDays').describe('Business days window.'),
        value: z.number().describe('Number of business days.'),
        rolling: z.boolean().optional().describe('Whether the window rolls forward.')
    }),
    z.object({
        type: z.literal('calendarDays').describe('Calendar days window.'),
        value: z.number().describe('Number of calendar days.'),
        rolling: z.boolean().optional().describe('Whether the window rolls forward.')
    }),
    z.object({
        type: z.literal('range').describe('Fixed date range window.'),
        start: z.string().describe('Start date.'),
        end: z.string().describe('End date.')
    }),
    z.object({
        disabled: z.literal(true).describe('Booking window is disabled.')
    })
]);

const OutputBookingLimitsCountSchema = z.union([
    z.object({
        disabled: z.literal(true).describe('Booking limits count is disabled.')
    }),
    z.object({
        PER_DAY: z.number().optional().describe('Maximum bookings per day.'),
        PER_WEEK: z.number().optional().describe('Maximum bookings per week.'),
        PER_MONTH: z.number().optional().describe('Maximum bookings per month.'),
        PER_YEAR: z.number().optional().describe('Maximum bookings per year.')
    })
]);

const OutputBookingLimitsDurationSchema = z.union([
    z.object({
        disabled: z.literal(true).describe('Booking limits duration is disabled.')
    }),
    z.object({
        PER_DAY: z.number().optional().describe('Maximum duration in minutes per day.'),
        PER_WEEK: z.number().optional().describe('Maximum duration in minutes per week.'),
        PER_MONTH: z.number().optional().describe('Maximum duration in minutes per month.'),
        PER_YEAR: z.number().optional().describe('Maximum duration in minutes per year.')
    })
]);

const OutputBookerActiveBookingsLimitSchema = z.union([
    z.object({
        enabled: z.boolean().describe('Whether the limit is enabled.'),
        limit: z.number().describe('Maximum number of active bookings.')
    }),
    z.object({
        disabled: z.literal(true).describe('Booker active bookings limit is disabled.')
    })
]);

const OutputUserSchema = z.object({
    id: z.number().describe('User ID.'),
    name: z.string().optional().describe('User display name.'),
    username: z.string().optional().describe('User username.'),
    avatarUrl: z.string().optional().describe('User avatar URL.'),
    weekStart: z.string().describe('Day the week starts on.'),
    brandColor: z.string().nullable().optional().describe('User brand color.'),
    darkBrandColor: z.string().nullable().optional().describe('User dark brand color.'),
    metadata: z.record(z.string(), z.unknown()).optional().describe('User metadata.')
});

const ProviderResponseSchema = z.object({
    status: z.enum(['success', 'error']).describe('Response status.'),
    data: z.object({
        id: z.number().describe('Unique identifier of the created event type.'),
        lengthInMinutes: z.number().describe('Duration of the event in minutes.'),
        lengthInMinutesOptions: z.array(z.number()).optional().describe('Alternative durations available.'),
        title: z.string().describe('Title of the event type.'),
        slug: z.string().describe('Slug of the event type.'),
        description: z.string().optional().describe('Description of the event type.'),
        locations: z.array(OutputLocationSchema).describe('Configured locations.'),
        bookingFields: z.array(z.unknown()).describe('Custom booking fields.'),
        disableGuests: z.boolean().describe('Whether guests are disabled.'),
        slotInterval: z.number().nullable().optional().describe('Slot interval in minutes.'),
        minimumBookingNotice: z.number().describe('Minimum booking notice in minutes.'),
        beforeEventBuffer: z.number().describe('Buffer before event in minutes.'),
        afterEventBuffer: z.number().describe('Buffer after event in minutes.'),
        recurrence: OutputRecurrenceSchema.nullable().describe('Recurrence settings.'),
        metadata: z.record(z.string(), z.unknown()).optional().describe('Event type metadata.'),
        price: z.number().describe('Price of the event.'),
        currency: z.string().describe('Currency of the price.'),
        lockTimeZoneToggleOnBookingPage: z.boolean().describe('Whether time zone toggle is locked.'),
        seatsPerTimeSlot: z.number().nullable().optional().describe('Number of seats per time slot.'),
        forwardParamsSuccessRedirect: z.boolean().nullable().optional().describe('Whether to forward params on success redirect.'),
        successRedirectUrl: z.string().nullable().optional().describe('Success redirect URL.'),
        isInstantEvent: z.boolean().describe('Whether this is an instant event.'),
        seatsShowAvailabilityCount: z.boolean().nullable().optional().describe('Whether to show seat availability count.'),
        scheduleId: z.number().nullable().optional().describe('Custom schedule ID.'),
        bookingLimitsCount: OutputBookingLimitsCountSchema.nullable().optional().describe('Booking count limits.'),
        bookerActiveBookingsLimit: OutputBookerActiveBookingsLimitSchema.nullable().optional().describe('Booker active bookings limit.'),
        onlyShowFirstAvailableSlot: z.boolean().describe('Whether only the first available slot is shown.'),
        bookingLimitsDuration: OutputBookingLimitsDurationSchema.nullable().optional().describe('Booking duration limits.'),
        bookingWindow: z
            .union([z.array(OutputBookingWindowSchema), OutputBookingWindowSchema])
            .nullable()
            .optional()
            .describe('Booking window limits.'),
        bookerLayouts: OutputBookerLayoutsSchema.nullable().optional().describe('Booker layouts.'),
        confirmationPolicy: OutputConfirmationPolicySchema.nullable().optional().describe('Confirmation policy.'),
        requiresBookerEmailVerification: z.boolean().describe('Whether booker email verification is required.'),
        skipAttendeeEmailDeliverabilityCheck: z.boolean().describe('Whether MX deliverability check is skipped.'),
        hideCalendarNotes: z.boolean().describe('Whether calendar notes are hidden.'),
        color: OutputColorSchema.nullable().optional().describe('Custom colors.'),
        seats: OutputSeatsSchema.nullable().optional().describe('Seat settings.'),
        offsetStart: z.number().nullable().optional().describe('Offset start in minutes.'),
        customName: z.string().nullable().optional().describe('Custom event name template.'),
        destinationCalendar: OutputDestinationCalendarSchema.nullable().optional().describe('Destination calendar.'),
        useDestinationCalendarEmail: z.boolean().describe('Whether to use destination calendar email.'),
        hideCalendarEventDetails: z.boolean().describe('Whether calendar event details are hidden.'),
        hideOrganizerEmail: z.boolean().describe('Whether organizer email is hidden.'),
        calVideoSettings: z.record(z.string(), z.unknown()).nullable().optional().describe('Cal Video settings.'),
        hidden: z.boolean().describe('Whether the event type is hidden.'),
        bookingRequiresAuthentication: z.boolean().describe('Whether booking requires authentication.'),
        disableCancelling: OutputDisableCancellingSchema.nullable().optional().describe('Cancellation settings.'),
        disableRescheduling: OutputDisableReschedulingSchema.nullable().optional().describe('Rescheduling settings.'),
        interfaceLanguage: z.string().nullable().optional().describe('Booking interface language.'),
        allowReschedulingPastBookings: z.boolean().describe('Whether past bookings can be rescheduled.'),
        allowReschedulingCancelledBookings: z.boolean().nullable().optional().describe('Whether cancelled bookings can be rescheduled.'),
        showOptimizedSlots: z.boolean().nullable().optional().describe('Whether optimized slots are shown.'),
        privateNoteEnabled: z.boolean().describe('Whether private notes are enabled.'),
        privateNoteMode: z.string().nullable().optional().describe('Private note delivery mode.'),
        privateNoteTemplate: z.string().nullable().optional().describe('Private note template.'),
        ownerId: z.number().describe('ID of the event type owner.'),
        users: z.array(OutputUserSchema).describe('Users associated with the event type.'),
        bookingUrl: z.string().describe('Full URL to the booking page.')
    })
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the created event type.'),
        lengthInMinutes: z.number().describe('Duration of the event in minutes.'),
        lengthInMinutesOptions: z.array(z.number()).optional().describe('Alternative durations available.'),
        title: z.string().describe('Title of the event type.'),
        slug: z.string().describe('Slug of the event type.'),
        description: z.string().optional().describe('Description of the event type.'),
        locations: z.array(OutputLocationSchema).describe('Configured locations.'),
        bookingFields: z.array(z.unknown()).describe('Custom booking fields.'),
        disableGuests: z.boolean().describe('Whether guests are disabled.'),
        slotInterval: z.number().optional().describe('Slot interval in minutes.'),
        minimumBookingNotice: z.number().describe('Minimum booking notice in minutes.'),
        beforeEventBuffer: z.number().describe('Buffer before event in minutes.'),
        afterEventBuffer: z.number().describe('Buffer after event in minutes.'),
        recurrence: OutputRecurrenceSchema.optional().describe('Recurrence settings.'),
        metadata: z.record(z.string(), z.unknown()).optional().describe('Event type metadata.'),
        price: z.number().describe('Price of the event.'),
        currency: z.string().describe('Currency of the price.'),
        lockTimeZoneToggleOnBookingPage: z.boolean().describe('Whether time zone toggle is locked.'),
        seatsPerTimeSlot: z.number().optional().describe('Number of seats per time slot.'),
        forwardParamsSuccessRedirect: z.boolean().optional().describe('Whether to forward params on success redirect.'),
        successRedirectUrl: z.string().optional().describe('Success redirect URL.'),
        isInstantEvent: z.boolean().describe('Whether this is an instant event.'),
        seatsShowAvailabilityCount: z.boolean().optional().describe('Whether to show seat availability count.'),
        scheduleId: z.number().optional().describe('Custom schedule ID.'),
        bookingLimitsCount: OutputBookingLimitsCountSchema.optional().describe('Booking count limits.'),
        bookerActiveBookingsLimit: OutputBookerActiveBookingsLimitSchema.optional().describe('Booker active bookings limit.'),
        onlyShowFirstAvailableSlot: z.boolean().describe('Whether only the first available slot is shown.'),
        bookingLimitsDuration: OutputBookingLimitsDurationSchema.optional().describe('Booking duration limits.'),
        bookingWindow: z.array(OutputBookingWindowSchema).optional().describe('Booking window limits.'),
        bookerLayouts: OutputBookerLayoutsSchema.optional().describe('Booker layouts.'),
        confirmationPolicy: OutputConfirmationPolicySchema.optional().describe('Confirmation policy.'),
        requiresBookerEmailVerification: z.boolean().describe('Whether booker email verification is required.'),
        skipAttendeeEmailDeliverabilityCheck: z.boolean().describe('Whether MX deliverability check is skipped.'),
        hideCalendarNotes: z.boolean().describe('Whether calendar notes are hidden.'),
        color: OutputColorSchema.optional().describe('Custom colors.'),
        seats: OutputSeatsSchema.optional().describe('Seat settings.'),
        offsetStart: z.number().optional().describe('Offset start in minutes.'),
        customName: z.string().optional().describe('Custom event name template.'),
        destinationCalendar: OutputDestinationCalendarSchema.optional().describe('Destination calendar.'),
        useDestinationCalendarEmail: z.boolean().describe('Whether to use destination calendar email.'),
        hideCalendarEventDetails: z.boolean().describe('Whether calendar event details are hidden.'),
        hideOrganizerEmail: z.boolean().describe('Whether organizer email is hidden.'),
        calVideoSettings: z.record(z.string(), z.unknown()).optional().describe('Cal Video settings.'),
        hidden: z.boolean().describe('Whether the event type is hidden.'),
        bookingRequiresAuthentication: z.boolean().describe('Whether booking requires authentication.'),
        disableCancelling: OutputDisableCancellingSchema.optional().describe('Cancellation settings.'),
        disableRescheduling: OutputDisableReschedulingSchema.optional().describe('Rescheduling settings.'),
        interfaceLanguage: z.string().optional().describe('Booking interface language.'),
        allowReschedulingPastBookings: z.boolean().describe('Whether past bookings can be rescheduled.'),
        allowReschedulingCancelledBookings: z.boolean().optional().describe('Whether cancelled bookings can be rescheduled.'),
        showOptimizedSlots: z.boolean().optional().describe('Whether optimized slots are shown.'),
        privateNoteEnabled: z.boolean().describe('Whether private notes are enabled.'),
        privateNoteMode: z.string().optional().describe('Private note delivery mode.'),
        privateNoteTemplate: z.string().optional().describe('Private note template.'),
        ownerId: z.number().describe('ID of the event type owner.'),
        users: z.array(OutputUserSchema).describe('Users associated with the event type.'),
        bookingUrl: z.string().describe('Full URL to the booking page.')
    })
    .describe('The newly created Cal.com event type.');

/**
 * @tags: [write]
 * @tagReason: Creates a new event type in the Cal.com account.
 * @pitfalls: OAuth access requires the EVENT_TYPE_WRITE scope. Only Google Meet, Microsoft Teams, Zoom, and the default Cal Video conferencing locations work without prior web-app installation; other apps must already be connected.
 */
const action = createAction({
    description: 'Create an event type in Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['EVENT_TYPE_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://cal.com/docs/api-reference/v2/event-types/create-an-event-type
        const response = await nango.post({
            endpoint: '/event-types',
            headers: {
                'cal-api-version': '2024-06-14'
            },
            data: {
                lengthInMinutes: input.lengthInMinutes,
                title: input.title,
                slug: input.slug,
                ...(input.lengthInMinutesOptions !== undefined && { lengthInMinutesOptions: input.lengthInMinutesOptions }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.locations !== undefined && { locations: input.locations }),
                ...(input.bookingFields !== undefined && { bookingFields: input.bookingFields }),
                ...(input.disableGuests !== undefined && { disableGuests: input.disableGuests }),
                ...(input.slotInterval !== undefined && { slotInterval: input.slotInterval }),
                ...(input.minimumBookingNotice !== undefined && { minimumBookingNotice: input.minimumBookingNotice }),
                ...(input.beforeEventBuffer !== undefined && { beforeEventBuffer: input.beforeEventBuffer }),
                ...(input.afterEventBuffer !== undefined && { afterEventBuffer: input.afterEventBuffer }),
                ...(input.scheduleId !== undefined && { scheduleId: input.scheduleId }),
                ...(input.bookingLimitsCount !== undefined && { bookingLimitsCount: input.bookingLimitsCount }),
                ...(input.bookerActiveBookingsLimit !== undefined && { bookerActiveBookingsLimit: input.bookerActiveBookingsLimit }),
                ...(input.onlyShowFirstAvailableSlot !== undefined && { onlyShowFirstAvailableSlot: input.onlyShowFirstAvailableSlot }),
                ...(input.bookingLimitsDuration !== undefined && { bookingLimitsDuration: input.bookingLimitsDuration }),
                ...(input.bookingWindow !== undefined && { bookingWindow: input.bookingWindow }),
                ...(input.offsetStart !== undefined && { offsetStart: input.offsetStart }),
                ...(input.bookerLayouts !== undefined && { bookerLayouts: input.bookerLayouts }),
                ...(input.confirmationPolicy !== undefined && { confirmationPolicy: input.confirmationPolicy }),
                ...(input.recurrence !== undefined && { recurrence: input.recurrence }),
                ...(input.requiresBookerEmailVerification !== undefined && { requiresBookerEmailVerification: input.requiresBookerEmailVerification }),
                ...(input.skipAttendeeEmailDeliverabilityCheck !== undefined && {
                    skipAttendeeEmailDeliverabilityCheck: input.skipAttendeeEmailDeliverabilityCheck
                }),
                ...(input.hideCalendarNotes !== undefined && { hideCalendarNotes: input.hideCalendarNotes }),
                ...(input.lockTimeZoneToggleOnBookingPage !== undefined && { lockTimeZoneToggleOnBookingPage: input.lockTimeZoneToggleOnBookingPage }),
                ...(input.color !== undefined && { color: input.color }),
                ...(input.seats !== undefined && { seats: input.seats }),
                ...(input.customName !== undefined && { customName: input.customName }),
                ...(input.destinationCalendar !== undefined && { destinationCalendar: input.destinationCalendar }),
                ...(input.useDestinationCalendarEmail !== undefined && { useDestinationCalendarEmail: input.useDestinationCalendarEmail }),
                ...(input.hideCalendarEventDetails !== undefined && { hideCalendarEventDetails: input.hideCalendarEventDetails }),
                ...(input.successRedirectUrl !== undefined && { successRedirectUrl: input.successRedirectUrl }),
                ...(input.hideOrganizerEmail !== undefined && { hideOrganizerEmail: input.hideOrganizerEmail }),
                ...(input.calVideoSettings !== undefined && { calVideoSettings: input.calVideoSettings }),
                ...(input.hidden !== undefined && { hidden: input.hidden }),
                ...(input.bookingRequiresAuthentication !== undefined && { bookingRequiresAuthentication: input.bookingRequiresAuthentication }),
                ...(input.disableCancelling !== undefined && { disableCancelling: input.disableCancelling }),
                ...(input.disableRescheduling !== undefined && { disableRescheduling: input.disableRescheduling }),
                ...(input.interfaceLanguage !== undefined && { interfaceLanguage: input.interfaceLanguage }),
                ...(input.allowReschedulingPastBookings !== undefined && { allowReschedulingPastBookings: input.allowReschedulingPastBookings }),
                ...(input.allowReschedulingCancelledBookings !== undefined && { allowReschedulingCancelledBookings: input.allowReschedulingCancelledBookings }),
                ...(input.showOptimizedSlots !== undefined && { showOptimizedSlots: input.showOptimizedSlots }),
                ...(input.privateNoteEnabled !== undefined && { privateNoteEnabled: input.privateNoteEnabled }),
                ...(input.privateNoteMode !== undefined && { privateNoteMode: input.privateNoteMode }),
                ...(input.privateNoteTemplate !== undefined && { privateNoteTemplate: input.privateNoteTemplate })
            },
            retries: 1
        });

        if (response.status < 200 || response.status >= 300) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Failed to create event type: ${response.status}`
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse provider response',
                details: parsed.error.issues
            });
        }

        if (parsed.data.status === 'error') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Provider returned an error when creating the event type.'
            });
        }

        const data = parsed.data.data;

        return {
            id: data.id,
            lengthInMinutes: data.lengthInMinutes,
            lengthInMinutesOptions: data.lengthInMinutesOptions,
            title: data.title,
            slug: data.slug,
            description: data.description,
            locations: data.locations,
            bookingFields: data.bookingFields,
            disableGuests: data.disableGuests,
            slotInterval: data.slotInterval != null ? data.slotInterval : undefined,
            minimumBookingNotice: data.minimumBookingNotice,
            beforeEventBuffer: data.beforeEventBuffer,
            afterEventBuffer: data.afterEventBuffer,
            recurrence:
                data.recurrence != null
                    ? {
                          interval: data.recurrence.interval,
                          occurrences: data.recurrence.occurrences,
                          frequency: data.recurrence.frequency,
                          disabled: data.recurrence.disabled
                      }
                    : undefined,
            metadata: data.metadata != null ? data.metadata : undefined,
            price: data.price,
            currency: data.currency,
            lockTimeZoneToggleOnBookingPage: data.lockTimeZoneToggleOnBookingPage,
            seatsPerTimeSlot: data.seatsPerTimeSlot != null ? data.seatsPerTimeSlot : undefined,
            forwardParamsSuccessRedirect: data.forwardParamsSuccessRedirect != null ? data.forwardParamsSuccessRedirect : undefined,
            successRedirectUrl: data.successRedirectUrl != null ? data.successRedirectUrl : undefined,
            isInstantEvent: data.isInstantEvent,
            seatsShowAvailabilityCount: data.seatsShowAvailabilityCount != null ? data.seatsShowAvailabilityCount : undefined,
            scheduleId: data.scheduleId != null ? data.scheduleId : undefined,
            bookingLimitsCount: data.bookingLimitsCount != null ? data.bookingLimitsCount : undefined,
            bookerActiveBookingsLimit: data.bookerActiveBookingsLimit != null ? data.bookerActiveBookingsLimit : undefined,
            onlyShowFirstAvailableSlot: data.onlyShowFirstAvailableSlot,
            bookingLimitsDuration: data.bookingLimitsDuration != null ? data.bookingLimitsDuration : undefined,
            bookingWindow: data.bookingWindow != null ? (Array.isArray(data.bookingWindow) ? data.bookingWindow : [data.bookingWindow]) : undefined,
            bookerLayouts: data.bookerLayouts != null ? data.bookerLayouts : undefined,
            confirmationPolicy: data.confirmationPolicy != null ? data.confirmationPolicy : undefined,
            requiresBookerEmailVerification: data.requiresBookerEmailVerification,
            skipAttendeeEmailDeliverabilityCheck: data.skipAttendeeEmailDeliverabilityCheck,
            hideCalendarNotes: data.hideCalendarNotes,
            color: data.color != null ? data.color : undefined,
            seats: data.seats != null ? data.seats : undefined,
            offsetStart: data.offsetStart != null ? data.offsetStart : undefined,
            customName: data.customName != null ? data.customName : undefined,
            destinationCalendar: data.destinationCalendar != null ? data.destinationCalendar : undefined,
            useDestinationCalendarEmail: data.useDestinationCalendarEmail,
            hideCalendarEventDetails: data.hideCalendarEventDetails,
            hideOrganizerEmail: data.hideOrganizerEmail,
            calVideoSettings: data.calVideoSettings != null ? data.calVideoSettings : undefined,
            hidden: data.hidden,
            bookingRequiresAuthentication: data.bookingRequiresAuthentication,
            disableCancelling: data.disableCancelling != null ? data.disableCancelling : undefined,
            disableRescheduling: data.disableRescheduling != null ? data.disableRescheduling : undefined,
            interfaceLanguage: data.interfaceLanguage != null ? data.interfaceLanguage : undefined,
            allowReschedulingPastBookings: data.allowReschedulingPastBookings,
            allowReschedulingCancelledBookings: data.allowReschedulingCancelledBookings != null ? data.allowReschedulingCancelledBookings : undefined,
            showOptimizedSlots: data.showOptimizedSlots != null ? data.showOptimizedSlots : undefined,
            privateNoteEnabled: data.privateNoteEnabled,
            privateNoteMode: data.privateNoteMode != null ? data.privateNoteMode : undefined,
            privateNoteTemplate: data.privateNoteTemplate != null ? data.privateNoteTemplate : undefined,
            ownerId: data.ownerId,
            users: data.users,
            bookingUrl: data.bookingUrl
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
