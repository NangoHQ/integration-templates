import { z } from 'zod';
import { createAction } from 'nango';

const QuestionSchema = z.object({
    code: z.string(),
    before: z.string().optional(),
    after: z.string().optional(),
    required: z.boolean().optional(),
    options: z.array(z.string()).optional(),
    validation: z.string().optional(),
    validationMessage: z.string().optional()
});

const EventSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    participants: z.array(z.string()).optional(),
    usingInviteParticipants: z.boolean().optional()
});

const AfterwardsSchema = z.object({
    text: z.string().optional(),
    url: z.string().optional(),
    isUrl: z.boolean().optional(),
    updateWholeBrowserWindow: z.boolean().optional(),
    eventShouldAppendLinks: z.boolean().optional(),
    ownerEvent: EventSchema.optional(),
    bookerEvent: EventSchema.optional(),
    bookingDescription: z.string().optional(),
    bookingTitle: z.string().optional(),
    bookingLocation: z.string().optional()
});

const CalendarsSchema = z.object({
    calendarIds: z.array(z.string()).optional(),
    targetCalendarId: z.string().optional()
});

const CancelOrRescheduleSchema = z.object({
    allowed: z.boolean().optional(),
    cancellationInstructions: z.string().optional(),
    limitMinutes: z.number().optional(),
    limitMessage: z.string().optional(),
    reasonRequired: z.boolean().optional(),
    showReasonTextBox: z.boolean().optional()
});

const DisplaySchema = z.object({
    showTimeZone: z.boolean().optional(),
    customThemeColor: z.string().optional(),
    header: z.string().optional(),
    footer: z.string().optional(),
    initialAvailabilityLayout: z.string().optional(),
    dayAvailabilityLayout: z.string().optional()
});

const PaymentsSchema = z.object({
    active: z.boolean().optional(),
    currency: z.string().optional(),
    priceType: z.string().optional(),
    partner: z.string().optional(),
    partnerDescription: z.string().optional(),
    promotionCodeAllowed: z.boolean().optional(),
    bookerReceiptRequired: z.boolean().optional(),
    currencyFactor: z.number().optional(),
    pricePerSlot: z.number().optional()
});

const AppointmentTypeItemSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    pic: z.string().optional(),
    slotLength: z.string().optional(),
    numberOfSlots: z.number().optional(),
    price: z.number().optional()
});

const AppointmentTypesSchema = z.object({
    active: z.boolean().optional(),
    description: z.string().optional(),
    combinable: z.boolean().optional(),
    randomizable: z.boolean().optional(),
    groupsCollapse: z.boolean().optional(),
    groupsActive: z.boolean().optional(),
    groupsDivider: z.string().optional(),
    items: z.array(AppointmentTypeItemSchema).optional()
});

const TeamMemberItemSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    pic: z.string().optional(),
    email: z.string().optional(),
    calendarId: z.string().optional()
});

const TeamMembersSchema = z.object({
    description: z.string().optional(),
    active: z.boolean().optional(),
    includeNoPreferenceOption: z.boolean().optional(),
    assumeNoPreferenceOption: z.boolean().optional(),
    allocationStrategy: z.string().optional(),
    allocationStrategyOnReschedule: z.string().optional(),
    items: z.array(TeamMemberItemSchema).optional()
});

const TentativeSchema = z.object({
    active: z.boolean().optional()
});

const WorkingTimesSchema = z.object({
    fixedStart: z.string().optional(),
    fixedEnd: z.string().optional(),
    bookingPadding: z.string().optional(),
    maxNoticeDays: z.number().optional(),
    minNotice: z.string().optional(),
    unitsPerSlot: z.number().optional(),
    customAvailabilityToken: z.string().optional(),
    workingDays: z.string().optional(),
    slotIncrement: z.string().optional(),
    defaultDuration: z.string().optional(),
    durations: z.string().optional(),
    active: z.boolean().optional()
});

const ActionSchema = z.object({
    id: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    accountId: z.string().optional(),
    profileId: z.string().optional(),
    bookingId: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    anchor: z.string().optional(),
    offsetMinutes: z.number().optional(),
    firedAt: z.string().optional(),
    title: z.string().optional(),
    to: z.string().optional(),
    fromName: z.string().optional(),
    fromAddress: z.string().optional(),
    subject: z.string().optional(),
    body: z.string().optional(),
    creditsUsed: z.number().optional(),
    attachIcs: z.boolean().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    failureCode: z.string().optional(),
    displayTimeZone: z.string().optional(),
    withinQuota: z.boolean().optional(),
    timeZone: z.string().optional(),
    ycbmBranded: z.boolean().optional()
});

const ProfileSchema = z.object({
    id: z.string(),
    createdBy: z.string().optional(),
    accountId: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    subdomain: z.string().optional(),
    logo: z.string().optional(),
    timeZoneOverride: z.boolean().optional(),
    captchaActive: z.boolean().optional(),
    accessCode: z.string().optional(),
    questions: z.array(QuestionSchema).optional(),
    afterwards: AfterwardsSchema.optional(),
    calendars: CalendarsSchema.optional(),
    cancelOrReschedule: CancelOrRescheduleSchema.optional(),
    display: DisplaySchema.optional(),
    payments: PaymentsSchema.optional(),
    appointmentTypes: AppointmentTypesSchema.optional(),
    teamMembers: TeamMembersSchema.optional(),
    tentative: TentativeSchema.optional(),
    workingTimes: WorkingTimesSchema.optional(),
    timeZone: z.string().optional(),
    locale: z.string().optional(),
    profileId: z.string().optional(),
    status: z.string().optional(),
    actions: z.array(ActionSchema).optional(),
    brandingType: z.string().optional()
});

const InputSchema = z.object({
    profileId: z.string().describe('Profile ID. Example: "string"'),
    title: z.string().optional(),
    description: z.string().optional(),
    subdomain: z.string().optional(),
    logo: z.string().optional(),
    timeZoneOverride: z.boolean().optional(),
    captchaActive: z.boolean().optional(),
    accessCode: z.string().optional(),
    questions: z.array(QuestionSchema).optional(),
    afterwards: AfterwardsSchema.optional(),
    calendars: CalendarsSchema.optional(),
    cancelOrReschedule: CancelOrRescheduleSchema.optional(),
    display: DisplaySchema.optional(),
    payments: PaymentsSchema.optional(),
    appointmentTypes: AppointmentTypesSchema.optional(),
    teamMembers: TeamMembersSchema.optional(),
    tentative: TentativeSchema.optional(),
    workingTimes: WorkingTimesSchema.optional(),
    timeZone: z.string().optional(),
    locale: z.string().optional(),
    status: z.string().optional(),
    brandingType: z.string().optional()
});

const OutputSchema = ProfileSchema;

const action = createAction({
    description: "Update a booking-page profile's configuration.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = {
            ...(input.title !== undefined && { title: input.title }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.subdomain !== undefined && { subdomain: input.subdomain }),
            ...(input.logo !== undefined && { logo: input.logo }),
            ...(input.timeZoneOverride !== undefined && { timeZoneOverride: input.timeZoneOverride }),
            ...(input.captchaActive !== undefined && { captchaActive: input.captchaActive }),
            ...(input.accessCode !== undefined && { accessCode: input.accessCode }),
            ...(input.questions !== undefined && { questions: input.questions }),
            ...(input.afterwards !== undefined && { afterwards: input.afterwards }),
            ...(input.calendars !== undefined && { calendars: input.calendars }),
            ...(input.cancelOrReschedule !== undefined && { cancelOrReschedule: input.cancelOrReschedule }),
            ...(input.display !== undefined && { display: input.display }),
            ...(input.payments !== undefined && { payments: input.payments }),
            ...(input.appointmentTypes !== undefined && { appointmentTypes: input.appointmentTypes }),
            ...(input.teamMembers !== undefined && { teamMembers: input.teamMembers }),
            ...(input.tentative !== undefined && { tentative: input.tentative }),
            ...(input.workingTimes !== undefined && { workingTimes: input.workingTimes }),
            ...(input.timeZone !== undefined && { timeZone: input.timeZone }),
            ...(input.locale !== undefined && { locale: input.locale }),
            ...(input.status !== undefined && { status: input.status }),
            ...(input.brandingType !== undefined && { brandingType: input.brandingType })
        };

        const response = await nango.patch({
            // https://api.youcanbook.me/v1/profiles/{profileId}
            endpoint: `v1/profiles/${encodeURIComponent(input.profileId)}`,
            data: body,
            retries: 3
        });

        const providerProfile = ProfileSchema.parse(response.data);

        return providerProfile;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
