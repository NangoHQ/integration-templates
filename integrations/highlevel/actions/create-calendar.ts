import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const TeamMemberInputSchema = z.object({
    userId: z.string().describe('Team member user ID. Example: "ocQHyuzHvysMo5N5VsXc"'),
    priority: z.number().optional().describe('Priority for round-robin distribution. Example: 0.5'),
    isPrimary: z.boolean().optional().describe('Whether this member is primary for collective calendars. Example: true')
});

const HourInputSchema = z.object({
    openHour: z.number().describe('Opening hour (0-23). Example: 9'),
    openMinute: z.number().describe('Opening minute (0-60). Example: 0'),
    closeHour: z.number().describe('Closing hour (0-23). Example: 17'),
    closeMinute: z.number().describe('Closing minute (0-60). Example: 0')
});

const OpenHourInputSchema = z.object({
    daysOfTheWeek: z.array(z.number()).describe('Days of the week (0=Sunday, 6=Saturday). Example: [1, 2, 3, 4, 5]'),
    hours: z.array(HourInputSchema).describe('Available time slots for these days')
});

const InputSchema = z.object({
    locationId: z.string().describe('Location ID. Example: "ve9EPM428h8vShlRW1KT"'),
    name: z.string().describe('Calendar name. Example: "Sales Consultation"'),
    eventType: z
        .enum(['RoundRobin_OptimizeForAvailability', 'RoundRobin_OptimizeForEqualDistribution'])
        .optional()
        .describe('Event type for round-robin calendars. Example: "RoundRobin_OptimizeForAvailability"'),
    calendarType: z
        .enum(['round_robin', 'event', 'class_booking', 'collective', 'service_booking', 'personal'])
        .optional()
        .describe('Calendar type. Example: "event"'),
    description: z.string().optional().describe('Calendar description. Example: "Book a 30-minute sales call"'),
    groupId: z.string().optional().describe('Calendar group ID. Example: "BqTwX8QFwXzpegMve9EQ"'),
    widgetType: z.enum(['default', 'classic']).optional().describe('Widget layout type. Example: "classic"'),
    slotDuration: z.number().optional().describe('Duration of each booking slot. Example: 30'),
    slotInterval: z.number().optional().describe('Interval between displayed slots. Example: 30'),
    isActive: z.boolean().optional().describe('Whether the calendar is active or draft. Default: true'),
    autoConfirm: z.boolean().optional().describe('Whether bookings are auto-confirmed. Default: true'),
    slug: z.string().optional().describe('URL-friendly calendar slug. Example: "sales-call"'),
    widgetSlug: z.string().optional().describe('Widget slug. Example: "sales-call"'),
    teamMembers: z.array(TeamMemberInputSchema).optional().describe('Team members assigned to this calendar'),
    openHours: z.array(OpenHourInputSchema).optional().describe('Standard weekly availability')
});

const TeamMemberResponseSchema = z.object({
    userId: z.string().nullable().optional(),
    priority: z.number().nullable().optional(),
    isPrimary: z.boolean().nullable().optional()
});

const HourResponseSchema = z.object({
    openHour: z.number().nullable().optional(),
    openMinute: z.number().nullable().optional(),
    closeHour: z.number().nullable().optional(),
    closeMinute: z.number().nullable().optional()
});

const OpenHourResponseSchema = z.object({
    daysOfTheWeek: z.array(z.number()).nullable().optional(),
    hours: z.array(HourResponseSchema).nullable().optional()
});

const ProviderCalendarSchema = z.object({
    id: z.string(),
    locationId: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    eventType: z.string().nullable().optional(),
    calendarType: z.string().nullable().optional(),
    groupId: z.string().nullable().optional(),
    widgetType: z.string().nullable().optional(),
    slug: z.string().nullable().optional(),
    widgetSlug: z.string().nullable().optional(),
    slotDuration: z.number().nullable().optional(),
    slotInterval: z.number().nullable().optional(),
    slotDurationUnit: z.string().nullable().optional(),
    slotIntervalUnit: z.string().nullable().optional(),
    isActive: z.boolean().nullable().optional(),
    autoConfirm: z.boolean().nullable().optional(),
    eventTitle: z.string().nullable().optional(),
    eventColor: z.string().nullable().optional(),
    teamMembers: z.array(TeamMemberResponseSchema).nullable().optional(),
    openHours: z
        .union([z.array(OpenHourResponseSchema), z.record(z.string(), z.unknown())])
        .nullable()
        .optional(),
    availabilityType: z.number().nullable().optional(),
    enableRecurring: z.boolean().nullable().optional(),
    formId: z.string().nullable().optional(),
    stickyContact: z.boolean().nullable().optional(),
    isLivePaymentMode: z.boolean().nullable().optional(),
    shouldSendAlertEmailsToAssignedMember: z.boolean().nullable().optional(),
    alertEmail: z.string().nullable().optional(),
    googleInvitationEmails: z.boolean().nullable().optional(),
    allowReschedule: z.boolean().nullable().optional(),
    allowCancellation: z.boolean().nullable().optional(),
    shouldAssignContactToTeamMember: z.boolean().nullable().optional(),
    shouldSkipAssigningContactForExisting: z.boolean().nullable().optional(),
    notes: z.string().nullable().optional(),
    pixelId: z.string().nullable().optional(),
    formSubmitType: z.string().nullable().optional(),
    formSubmitRedirectURL: z.string().nullable().optional(),
    formSubmitThanksMessage: z.string().nullable().optional(),
    guestType: z.string().nullable().optional(),
    consentLabel: z.string().nullable().optional(),
    calendarCoverImage: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    calendar: ProviderCalendarSchema
});

const OutputSchema = z.object({
    id: z.string(),
    locationId: z.string(),
    name: z.string(),
    description: z.string().optional(),
    eventType: z.string().optional(),
    calendarType: z.string().optional(),
    groupId: z.string().optional(),
    widgetType: z.string().optional(),
    slug: z.string().optional(),
    widgetSlug: z.string().optional(),
    slotDuration: z.number().optional(),
    slotInterval: z.number().optional(),
    slotDurationUnit: z.string().optional(),
    slotIntervalUnit: z.string().optional(),
    isActive: z.boolean().optional(),
    autoConfirm: z.boolean().optional(),
    eventTitle: z.string().optional(),
    eventColor: z.string().optional(),
    teamMembers: z.array(TeamMemberResponseSchema).optional(),
    openHours: z.array(OpenHourResponseSchema).optional(),
    availabilityType: z.number().optional(),
    enableRecurring: z.boolean().optional(),
    formId: z.string().optional(),
    stickyContact: z.boolean().optional(),
    isLivePaymentMode: z.boolean().optional(),
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
    guestType: z.string().optional(),
    consentLabel: z.string().optional(),
    calendarCoverImage: z.string().optional()
});

const action = createAction({
    description: 'Create a calendar in HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['calendars.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://highlevel.stoplight.io/docs/integrations/create-calendar
            endpoint: '/calendars/',
            headers: {
                Version: '2021-07-28'
            },
            data: {
                locationId: input.locationId,
                name: input.name,
                ...(input.eventType !== undefined && { eventType: input.eventType }),
                ...(input.calendarType !== undefined && { calendarType: input.calendarType }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.groupId !== undefined && { groupId: input.groupId }),
                ...(input.widgetType !== undefined && { widgetType: input.widgetType }),
                ...(input.slotDuration !== undefined && { slotDuration: input.slotDuration }),
                ...(input.slotInterval !== undefined && { slotInterval: input.slotInterval }),
                ...(input.isActive !== undefined && { isActive: input.isActive }),
                ...(input.autoConfirm !== undefined && { autoConfirm: input.autoConfirm }),
                ...(input.slug !== undefined && { slug: input.slug }),
                ...(input.widgetSlug !== undefined && { widgetSlug: input.widgetSlug }),
                ...(input.teamMembers !== undefined && { teamMembers: input.teamMembers }),
                ...(input.openHours !== undefined && { openHours: input.openHours })
            },
            retries: 1
        };

        const response = await nango.post(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'HighLevel did not return a response body when creating the calendar.'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const calendar = providerResponse.calendar;

        return {
            id: calendar.id,
            locationId: calendar.locationId,
            name: calendar.name,
            ...(calendar.description != null && { description: calendar.description }),
            ...(calendar.eventType != null && { eventType: calendar.eventType }),
            ...(calendar.calendarType != null && { calendarType: calendar.calendarType }),
            ...(calendar.groupId != null && { groupId: calendar.groupId }),
            ...(calendar.widgetType != null && { widgetType: calendar.widgetType }),
            ...(calendar.slug != null && { slug: calendar.slug }),
            ...(calendar.widgetSlug != null && { widgetSlug: calendar.widgetSlug }),
            ...(calendar.slotDuration != null && { slotDuration: calendar.slotDuration }),
            ...(calendar.slotInterval != null && { slotInterval: calendar.slotInterval }),
            ...(calendar.slotDurationUnit != null && { slotDurationUnit: calendar.slotDurationUnit }),
            ...(calendar.slotIntervalUnit != null && { slotIntervalUnit: calendar.slotIntervalUnit }),
            ...(calendar.isActive != null && { isActive: calendar.isActive }),
            ...(calendar.autoConfirm != null && { autoConfirm: calendar.autoConfirm }),
            ...(calendar.eventTitle != null && { eventTitle: calendar.eventTitle }),
            ...(calendar.eventColor != null && { eventColor: calendar.eventColor }),
            ...(calendar.teamMembers != null && {
                teamMembers: calendar.teamMembers.map((member) => ({
                    ...(member.userId != null && { userId: member.userId }),
                    ...(member.priority != null && { priority: member.priority }),
                    ...(member.isPrimary != null && { isPrimary: member.isPrimary })
                }))
            }),
            ...(calendar.openHours != null &&
                Array.isArray(calendar.openHours) && {
                    openHours: calendar.openHours.map((oh) => ({
                        ...(oh.daysOfTheWeek != null && { daysOfTheWeek: oh.daysOfTheWeek }),
                        ...(oh.hours != null && {
                            hours: oh.hours.map((h) => ({
                                ...(h.openHour != null && { openHour: h.openHour }),
                                ...(h.openMinute != null && { openMinute: h.openMinute }),
                                ...(h.closeHour != null && { closeHour: h.closeHour }),
                                ...(h.closeMinute != null && { closeMinute: h.closeMinute })
                            }))
                        })
                    }))
                }),
            ...(calendar.availabilityType != null && { availabilityType: calendar.availabilityType }),
            ...(calendar.enableRecurring != null && { enableRecurring: calendar.enableRecurring }),
            ...(calendar.formId != null && { formId: calendar.formId }),
            ...(calendar.stickyContact != null && { stickyContact: calendar.stickyContact }),
            ...(calendar.isLivePaymentMode != null && { isLivePaymentMode: calendar.isLivePaymentMode }),
            ...(calendar.shouldSendAlertEmailsToAssignedMember != null && {
                shouldSendAlertEmailsToAssignedMember: calendar.shouldSendAlertEmailsToAssignedMember
            }),
            ...(calendar.alertEmail != null && { alertEmail: calendar.alertEmail }),
            ...(calendar.googleInvitationEmails != null && { googleInvitationEmails: calendar.googleInvitationEmails }),
            ...(calendar.allowReschedule != null && { allowReschedule: calendar.allowReschedule }),
            ...(calendar.allowCancellation != null && { allowCancellation: calendar.allowCancellation }),
            ...(calendar.shouldAssignContactToTeamMember != null && {
                shouldAssignContactToTeamMember: calendar.shouldAssignContactToTeamMember
            }),
            ...(calendar.shouldSkipAssigningContactForExisting != null && {
                shouldSkipAssigningContactForExisting: calendar.shouldSkipAssigningContactForExisting
            }),
            ...(calendar.notes != null && { notes: calendar.notes }),
            ...(calendar.pixelId != null && { pixelId: calendar.pixelId }),
            ...(calendar.formSubmitType != null && { formSubmitType: calendar.formSubmitType }),
            ...(calendar.formSubmitRedirectURL != null && { formSubmitRedirectURL: calendar.formSubmitRedirectURL }),
            ...(calendar.formSubmitThanksMessage != null && { formSubmitThanksMessage: calendar.formSubmitThanksMessage }),
            ...(calendar.guestType != null && { guestType: calendar.guestType }),
            ...(calendar.consentLabel != null && { consentLabel: calendar.consentLabel }),
            ...(calendar.calendarCoverImage != null && { calendarCoverImage: calendar.calendarCoverImage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
