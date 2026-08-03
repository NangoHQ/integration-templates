import { z } from 'zod';
import { createAction } from 'nango';

const ProfileQuestionSchema = z.object({
    code: z.string(),
    before: z.string().optional(),
    after: z.string().optional(),
    required: z.boolean().optional(),
    options: z.array(z.string()).optional(),
    validation: z.string().optional(),
    validationMessage: z.string().optional()
});

const ProfileAfterwardsSchema = z.object({
    text: z.string().optional(),
    url: z.string().optional(),
    isUrl: z.boolean().optional(),
    updateWholeBrowserWindow: z.boolean().optional(),
    eventShouldAppendLinks: z.boolean().optional(),
    ownerEvent: z
        .object({
            title: z.string().optional(),
            description: z.string().optional(),
            location: z.string().optional(),
            participants: z.array(z.string()).optional(),
            usingInviteParticipants: z.boolean().optional()
        })
        .optional(),
    bookerEvent: z
        .object({
            title: z.string().optional(),
            description: z.string().optional(),
            location: z.string().optional(),
            participants: z.array(z.string()).optional(),
            usingInviteParticipants: z.boolean().optional()
        })
        .optional(),
    bookingDescription: z.string().optional(),
    bookingTitle: z.string().optional(),
    bookingLocation: z.string().optional()
});

const ProfileCalendarsSchema = z.object({
    calendarIds: z.array(z.string()).optional(),
    targetCalendarId: z.string().optional()
});

const ProfileCancelOrRescheduleSchema = z.object({
    allowed: z.boolean().optional(),
    cancellationInstructions: z.string().optional(),
    limitMinutes: z.number().optional(),
    limitMessage: z.string().optional(),
    reasonRequired: z.boolean().optional(),
    showReasonTextBox: z.boolean().optional()
});

const ProfileDisplaySchema = z.object({
    showTimeZone: z.boolean().optional(),
    customThemeColor: z.string().optional(),
    header: z.string().optional(),
    footer: z.string().optional(),
    initialAvailabilityLayout: z.string().optional(),
    dayAvailabilityLayout: z.string().optional()
});

const ProfilePaymentsSchema = z.object({
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

const ProfileAppointmentTypeItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    pic: z.string().optional(),
    slotLength: z.string().optional(),
    numberOfSlots: z.number().optional(),
    price: z.number().optional()
});

const ProfileAppointmentTypesSchema = z.object({
    active: z.boolean().optional(),
    description: z.string().optional(),
    combinable: z.boolean().optional(),
    randomizable: z.boolean().optional(),
    groupsCollapse: z.boolean().optional(),
    groupsActive: z.boolean().optional(),
    groupsDivider: z.string().optional(),
    items: z.array(ProfileAppointmentTypeItemSchema).optional()
});

const ProfileTeamMemberItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    pic: z.string().optional(),
    email: z.string().optional(),
    calendarId: z.string().optional()
});

const ProfileTeamMembersSchema = z.object({
    description: z.string().optional(),
    active: z.boolean().optional(),
    includeNoPreferenceOption: z.boolean().optional(),
    assumeNoPreferenceOption: z.boolean().optional(),
    allocationStrategy: z.string().optional(),
    allocationStrategyOnReschedule: z.string().optional(),
    items: z.array(ProfileTeamMemberItemSchema).optional()
});

const ProfileTentativeSchema = z.object({
    active: z.boolean().optional()
});

const ProfileWorkingTimesSchema = z.object({
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

const ProfileActionSchema = z.object({
    id: z.string(),
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

const ProviderProfileSchema = z.object({
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
    questions: z.array(ProfileQuestionSchema).optional(),
    afterwards: ProfileAfterwardsSchema.optional(),
    calendars: ProfileCalendarsSchema.optional(),
    cancelOrReschedule: ProfileCancelOrRescheduleSchema.optional(),
    display: ProfileDisplaySchema.optional(),
    payments: ProfilePaymentsSchema.optional(),
    appointmentTypes: ProfileAppointmentTypesSchema.optional(),
    teamMembers: ProfileTeamMembersSchema.optional(),
    tentative: ProfileTentativeSchema.optional(),
    workingTimes: ProfileWorkingTimesSchema.optional(),
    timeZone: z.string().optional(),
    locale: z.string().optional(),
    profileId: z.string().optional(),
    status: z.string().optional(),
    actions: z.array(ProfileActionSchema).optional(),
    brandingType: z.string().optional()
});

const InputSchema = z.object({
    title: z.string().describe('Display title for the booking page. Example: "My Booking Page"'),
    subdomain: z.string().describe('Unique URL slug for the profile. Example: "my-page"'),
    description: z.string().optional().describe('Description shown on the booking page.'),
    locale: z.string().optional().describe('Language locale for the profile. Example: "en-US"'),
    status: z.string().optional().describe('Profile status. Example: "ONLINE" or "OFFLINE"'),
    timeZone: z.string().optional().describe('Timezone for the profile. Example: "America/New_York"')
});

const OutputSchema = ProviderProfileSchema;

const action = createAction({
    description: 'Create a new booking-page profile.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://api-docs.youcanbook.me (POST /v1/profiles)
            endpoint: '/v1/profiles',
            data: {
                title: input.title,
                subdomain: input.subdomain,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.locale !== undefined && { locale: input.locale }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.timeZone !== undefined && { timeZone: input.timeZone })
            },
            retries: 3
        });

        const providerProfile = ProviderProfileSchema.parse(response.data);

        return providerProfile;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
