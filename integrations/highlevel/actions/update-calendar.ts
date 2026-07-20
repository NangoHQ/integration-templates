import { z } from 'zod';
import { createAction } from 'nango';

const LocationConfigurationInputSchema = z
    .object({
        kind: z.string().describe('Meeting location kind. Example: "custom"'),
        location: z.string().optional().describe('Meeting location value, e.g. an address or URL.'),
        meetingId: z.string().optional().describe('Meeting ID for video-conferencing locations.')
    })
    .passthrough();

const TeamMemberInputSchema = z
    .object({
        userId: z.string().describe('Team member user ID. Example: "ocQHyuzHvysMo5N5VsXc"'),
        priority: z.number().optional().describe('Priority for round-robin distribution. Example: 0.5'),
        meetingLocationType: z.string().optional(),
        meetingLocation: z.string().optional(),
        isPrimary: z.boolean().optional().describe('Whether this member is primary for collective calendars. Example: true'),
        locationConfigurations: z.array(LocationConfigurationInputSchema).optional()
    })
    .passthrough();

const HourInputSchema = z
    .object({
        openHour: z.number().describe('Opening hour (0-23). Example: 9'),
        openMinute: z.number().describe('Opening minute (0-60). Example: 0'),
        closeHour: z.number().describe('Closing hour (0-23). Example: 17'),
        closeMinute: z.number().describe('Closing minute (0-60). Example: 0')
    })
    .passthrough();

const OpenHourInputSchema = z
    .object({
        daysOfTheWeek: z.array(z.number()).describe('Days of the week (0=Sunday, 6=Saturday). Example: [1, 2, 3, 4, 5]'),
        hours: z.array(HourInputSchema).describe('Available time slots for these days')
    })
    .passthrough();

const RecurringInputSchema = z
    .object({
        freq: z.string().optional().describe('Recurrence frequency. Example: "DAILY"'),
        count: z.number().optional().describe('Number of occurrences. Example: 24'),
        bookingOption: z.string().optional().describe('Booking option for recurring bookings. Example: "skip"'),
        bookingOverlapDefaultStatus: z.string().optional().describe('Default status for overlapping bookings. Example: "confirmed"')
    })
    .passthrough();

const AvailabilityInputSchema = z
    .object({
        date: z.string().describe('Date this override applies to, in ISO 8601 format. Example: "2026-08-01"'),
        hours: z.array(HourInputSchema),
        deleted: z.boolean().optional()
    })
    .passthrough();

const CalendarNotificationInputSchema = z
    .object({
        type: z.string().optional().describe('Notification channel. Example: "email"'),
        shouldSendToContact: z.boolean(),
        shouldSendToGuest: z.boolean(),
        shouldSendToUser: z.boolean(),
        shouldSendToSelectedUsers: z.boolean(),
        selectedUsers: z.string()
    })
    .passthrough();

const LookBusyConfigInputSchema = z
    .object({
        enabled: z.boolean(),
        LookBusyPercentage: z.number()
    })
    .passthrough();

const InputSchema = z.object({
    calendarId: z.string().describe('Calendar ID. Example: "ocQHyuzHvysMo5N5VsXc"'),
    groupId: z.string().optional().describe('Group Id'),
    teamMembers: z.array(TeamMemberInputSchema).optional(),
    eventType: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    slug: z.string().optional(),
    widgetSlug: z.string().optional(),
    widgetType: z.string().optional(),
    eventTitle: z.string().optional(),
    eventColor: z.string().optional(),
    locationConfigurations: z.array(LocationConfigurationInputSchema).optional(),
    slotDuration: z.number().optional(),
    slotDurationUnit: z.string().optional(),
    preBufferUnit: z.string().optional(),
    slotInterval: z.number().optional(),
    slotIntervalUnit: z.string().optional(),
    slotBuffer: z.number().optional(),
    preBuffer: z.number().optional(),
    appoinmentPerSlot: z.number().optional(),
    appoinmentPerDay: z.number().optional(),
    allowBookingAfter: z.number().optional(),
    allowBookingAfterUnit: z.string().optional(),
    allowBookingFor: z.number().optional(),
    allowBookingForUnit: z.string().optional(),
    openHours: z.array(OpenHourInputSchema).optional(),
    enableRecurring: z.boolean().optional(),
    recurring: RecurringInputSchema.optional().describe('Recurring-calendar configuration, used when enableRecurring is true.'),
    formId: z.string().optional(),
    stickyContact: z.boolean().optional(),
    isLivePaymentMode: z.boolean().optional(),
    autoConfirm: z.boolean().optional(),
    shouldSendAlertEmailsToAssignedMember: z.boolean().optional(),
    alertEmail: z.string().optional(),
    googleInvitationEmails: z.boolean().optional(),
    allowReschedule: z.boolean().optional(),
    allowCancellation: z.boolean().optional(),
    shouldAssignContactToTeamMember: z.boolean().optional(),
    shouldSkipAssigningContactForExisting: z.boolean().optional(),
    notes: z.string().optional(),
    pixelId: z.string().optional(),
    formSubmitType: z.string().optional(),
    formSubmitRedirectURL: z.string().optional(),
    formSubmitThanksMessage: z.string().optional(),
    availabilityType: z.number().optional(),
    availabilities: z.array(AvailabilityInputSchema).optional(),
    notifications: z.array(CalendarNotificationInputSchema).optional(),
    guestType: z.string().optional(),
    consentLabel: z.string().optional(),
    calendarCoverImage: z.string().optional(),
    lookBusyConfig: LookBusyConfigInputSchema.optional(),
    isActive: z.boolean().optional()
});

const ProviderCalendarSchema = z
    .object({
        id: z.string(),
        locationId: z.string(),
        name: z.string(),
        description: z.string().optional(),
        slug: z.string().optional(),
        widgetSlug: z.string().optional(),
        calendarType: z.string().optional(),
        widgetType: z.string().optional(),
        eventTitle: z.string().optional(),
        eventColor: z.string().optional(),
        meetingLocation: z.string().optional(),
        locationConfigurations: z.array(z.unknown()).optional(),
        slotDuration: z.number().optional(),
        slotDurationUnit: z.string().optional(),
        slotInterval: z.number().optional(),
        slotIntervalUnit: z.string().optional(),
        slotBuffer: z.number().optional(),
        preBuffer: z.number().optional(),
        appoinmentPerSlot: z.number().optional(),
        appoinmentPerDay: z.number().optional(),
        allowBookingAfter: z.number().optional(),
        allowBookingAfterUnit: z.string().optional(),
        allowBookingFor: z.number().optional(),
        allowBookingForUnit: z.string().optional(),
        openHours: z.unknown().optional(),
        enableRecurring: z.boolean().optional(),
        formId: z.string().optional(),
        stickyContact: z.boolean().optional(),
        isLivePaymentMode: z.boolean().optional(),
        autoConfirm: z.boolean().optional(),
        shouldSendAlertEmailsToAssignedMember: z.boolean().optional(),
        alertEmail: z.string().optional(),
        googleInvitationEmails: z.boolean().optional(),
        allowReschedule: z.boolean().optional(),
        allowCancellation: z.boolean().optional(),
        shouldAssignContactToTeamMember: z.boolean().optional(),
        shouldSkipAssigningContactForExisting: z.boolean().optional(),
        notes: z.string().optional(),
        pixelId: z.string().optional(),
        formSubmitType: z.string().optional(),
        formSubmitRedirectURL: z.string().optional(),
        formSubmitThanksMessage: z.string().optional(),
        availabilityType: z.number().optional(),
        availabilities: z.array(z.unknown()).optional(),
        guestType: z.string().optional(),
        consentLabel: z.string().optional(),
        calendarCoverImage: z.string().optional(),
        isActive: z.boolean().optional(),
        groupId: z.string().optional(),
        eventType: z.string().optional(),
        teamMembers: z.array(z.unknown()).optional(),
        notifications: z.array(z.unknown()).optional(),
        lookBusyConfig: z.record(z.string(), z.unknown()).optional(),
        recurring: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    calendar: ProviderCalendarSchema
});

const action = createAction({
    description: 'Update a calendar in HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['calendars.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.groupId !== undefined) data['groupId'] = input.groupId;
        if (input.teamMembers !== undefined) data['teamMembers'] = input.teamMembers;
        if (input.eventType !== undefined) data['eventType'] = input.eventType;
        if (input.name !== undefined) data['name'] = input.name;
        if (input.description !== undefined) data['description'] = input.description;
        if (input.slug !== undefined) data['slug'] = input.slug;
        if (input.widgetSlug !== undefined) data['widgetSlug'] = input.widgetSlug;
        if (input.widgetType !== undefined) data['widgetType'] = input.widgetType;
        if (input.eventTitle !== undefined) data['eventTitle'] = input.eventTitle;
        if (input.eventColor !== undefined) data['eventColor'] = input.eventColor;
        if (input.locationConfigurations !== undefined) data['locationConfigurations'] = input.locationConfigurations;
        if (input.slotDuration !== undefined) data['slotDuration'] = input.slotDuration;
        if (input.slotDurationUnit !== undefined) data['slotDurationUnit'] = input.slotDurationUnit;
        if (input.preBufferUnit !== undefined) data['preBufferUnit'] = input.preBufferUnit;
        if (input.slotInterval !== undefined) data['slotInterval'] = input.slotInterval;
        if (input.slotIntervalUnit !== undefined) data['slotIntervalUnit'] = input.slotIntervalUnit;
        if (input.slotBuffer !== undefined) data['slotBuffer'] = input.slotBuffer;
        if (input.preBuffer !== undefined) data['preBuffer'] = input.preBuffer;
        if (input.appoinmentPerSlot !== undefined) data['appoinmentPerSlot'] = input.appoinmentPerSlot;
        if (input.appoinmentPerDay !== undefined) data['appoinmentPerDay'] = input.appoinmentPerDay;
        if (input.allowBookingAfter !== undefined) data['allowBookingAfter'] = input.allowBookingAfter;
        if (input.allowBookingAfterUnit !== undefined) data['allowBookingAfterUnit'] = input.allowBookingAfterUnit;
        if (input.allowBookingFor !== undefined) data['allowBookingFor'] = input.allowBookingFor;
        if (input.allowBookingForUnit !== undefined) data['allowBookingForUnit'] = input.allowBookingForUnit;
        if (input.openHours !== undefined) data['openHours'] = input.openHours;
        if (input.enableRecurring !== undefined) data['enableRecurring'] = input.enableRecurring;
        if (input.recurring !== undefined) data['recurring'] = input.recurring;
        if (input.formId !== undefined) data['formId'] = input.formId;
        if (input.stickyContact !== undefined) data['stickyContact'] = input.stickyContact;
        if (input.isLivePaymentMode !== undefined) data['isLivePaymentMode'] = input.isLivePaymentMode;
        if (input.autoConfirm !== undefined) data['autoConfirm'] = input.autoConfirm;
        if (input.shouldSendAlertEmailsToAssignedMember !== undefined)
            data['shouldSendAlertEmailsToAssignedMember'] = input.shouldSendAlertEmailsToAssignedMember;
        if (input.alertEmail !== undefined) data['alertEmail'] = input.alertEmail;
        if (input.googleInvitationEmails !== undefined) data['googleInvitationEmails'] = input.googleInvitationEmails;
        if (input.allowReschedule !== undefined) data['allowReschedule'] = input.allowReschedule;
        if (input.allowCancellation !== undefined) data['allowCancellation'] = input.allowCancellation;
        if (input.shouldAssignContactToTeamMember !== undefined) data['shouldAssignContactToTeamMember'] = input.shouldAssignContactToTeamMember;
        if (input.shouldSkipAssigningContactForExisting !== undefined)
            data['shouldSkipAssigningContactForExisting'] = input.shouldSkipAssigningContactForExisting;
        if (input.notes !== undefined) data['notes'] = input.notes;
        if (input.pixelId !== undefined) data['pixelId'] = input.pixelId;
        if (input.formSubmitType !== undefined) data['formSubmitType'] = input.formSubmitType;
        if (input.formSubmitRedirectURL !== undefined) data['formSubmitRedirectURL'] = input.formSubmitRedirectURL;
        if (input.formSubmitThanksMessage !== undefined) data['formSubmitThanksMessage'] = input.formSubmitThanksMessage;
        if (input.availabilityType !== undefined) data['availabilityType'] = input.availabilityType;
        if (input.availabilities !== undefined) data['availabilities'] = input.availabilities;
        if (input.notifications !== undefined) data['notifications'] = input.notifications;
        if (input.guestType !== undefined) data['guestType'] = input.guestType;
        if (input.consentLabel !== undefined) data['consentLabel'] = input.consentLabel;
        if (input.calendarCoverImage !== undefined) data['calendarCoverImage'] = input.calendarCoverImage;
        if (input.lookBusyConfig !== undefined) data['lookBusyConfig'] = input.lookBusyConfig;
        if (input.isActive !== undefined) data['isActive'] = input.isActive;

        // https://highlevel.stoplight.io/docs/integrations/calendars/update-calendar
        // Source of truth: https://github.com/GoHighLevel/highlevel-api-docs/blob/main/apps/calendars.json
        const response = await nango.put({
            endpoint: `/calendars/${encodeURIComponent(input.calendarId)}`,
            headers: {
                Version: '2021-07-28'
            },
            data,
            retries: 3
        });

        const providerResponse = z
            .object({
                calendar: ProviderCalendarSchema
            })
            .parse(response.data);

        return {
            calendar: providerResponse.calendar
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
