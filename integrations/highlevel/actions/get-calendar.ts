import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().describe('Calendar ID. Example: "EezkTNetkctqSCPB5LCc"')
});

const HourSchema = z.object({
    openHour: z.number(),
    openMinute: z.number(),
    closeHour: z.number(),
    closeMinute: z.number()
});

const OpenHourSchema = z.object({
    daysOfTheWeek: z.array(z.number()),
    hours: z.array(HourSchema)
});

const RecurringSchema = z.object({
    freq: z.string().optional(),
    count: z.number().optional(),
    bookingOption: z.string().optional(),
    bookingOverlapDefaultStatus: z.string().optional()
});

const AvailabilitySchema = z.object({
    date: z.string(),
    hours: z.array(HourSchema),
    deleted: z.boolean().optional()
});

const CalendarNotificationSchema = z.object({
    type: z.string().optional(),
    shouldSendToContact: z.boolean(),
    shouldSendToGuest: z.boolean(),
    shouldSendToUser: z.boolean(),
    shouldSendToSelectedUsers: z.boolean(),
    selectedUsers: z.string()
});

const LocationConfigurationSchema = z.object({
    kind: z.string(),
    location: z.string().optional(),
    meetingId: z.string().optional()
});

const TeamMemberSchema = z.object({
    userId: z.string(),
    priority: z.number().optional(),
    meetingLocationType: z.string().optional(),
    meetingLocation: z.string().optional(),
    isPrimary: z.boolean().optional(),
    locationConfigurations: z.array(LocationConfigurationSchema).optional()
});

const LookBusyConfigurationSchema = z.object({
    enabled: z.boolean(),
    LookBusyPercentage: z.number()
});

const CalendarSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        locationId: z.string(),
        groupId: z.string().optional(),
        teamMembers: z.array(TeamMemberSchema).optional(),
        eventType: z.string().optional(),
        slug: z.string().optional(),
        widgetSlug: z.string().optional(),
        calendarType: z.string().optional(),
        widgetType: z.string().optional(),
        eventTitle: z.string().optional(),
        eventColor: z.string().optional(),
        meetingLocation: z.string().optional(),
        locationConfigurations: z.array(LocationConfigurationSchema).optional(),
        slotDuration: z.number().optional(),
        slotDurationUnit: z.string().optional(),
        slotInterval: z.number().optional(),
        slotIntervalUnit: z.string().optional(),
        slotBuffer: z.number().optional(),
        slotBufferUnit: z.string().optional(),
        preBuffer: z.number().optional(),
        preBufferUnit: z.string().optional(),
        appoinmentPerSlot: z.number().optional(),
        appoinmentPerDay: z.number().optional(),
        allowBookingAfter: z.number().optional(),
        allowBookingAfterUnit: z.string().optional(),
        allowBookingFor: z.number().optional(),
        allowBookingForUnit: z.string().optional(),
        openHours: z.union([z.array(OpenHourSchema), z.record(z.string(), z.unknown())]).optional(),
        enableRecurring: z.boolean().optional(),
        recurring: RecurringSchema.optional(),
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
        availabilities: z.array(AvailabilitySchema).optional(),
        guestType: z.string().optional(),
        consentLabel: z.string().optional(),
        calendarCoverImage: z.string().optional(),
        lookBusyConfig: LookBusyConfigurationSchema.optional(),
        notifications: z.array(CalendarNotificationSchema).optional(),
        isActive: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = CalendarSchema;

const action = createAction({
    description: 'Retrieve a single calendar from HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['calendars.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://highlevel.stoplight.io/docs/integrations/calendars/get-calendar
        const response = await nango.get({
            endpoint: `/calendars/${encodeURIComponent(input.calendarId)}`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Calendar not found',
                calendarId: input.calendarId
            });
        }

        const wrapper = z
            .object({
                calendar: CalendarSchema
            })
            .parse(response.data);

        return wrapper.calendar;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
