import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    profileId: z.string().describe('Profile ID of the booking page. Example: "f4f38519-6e5c-45f2-9897-555960aae524"'),
    startsAt: z.string().describe('Booking start time in ISO 8601 format. Example: "2024-01-15T10:00:00Z"'),
    endsAt: z
        .string()
        .optional()
        .describe('Booking end time in ISO 8601 format. Example: "2024-01-15T11:00:00Z". The API may calculate this automatically based on profile settings.'),
    title: z.string().optional().describe('Booking title'),
    timeZone: z.string().optional().describe('Time zone for the booking. Example: "America/Los_Angeles"'),
    locale: z.string().optional().describe('Locale for the booking. Example: "en_US"'),
    teamMemberId: z.string().optional().describe('Team member ID (deprecated but supported)'),
    appointmentTypesIds: z.array(z.string()).optional().describe('Appointment type IDs (deprecated but supported)'),
    teamMember: z
        .object({
            id: z.string().optional(),
            name: z.string().optional(),
            description: z.string().optional(),
            pic: z.string().optional(),
            email: z.string().optional(),
            calendarId: z.string().optional()
        })
        .optional()
        .describe('Team member object'),
    appointmentTypes: z
        .array(
            z.object({
                id: z.string().optional(),
                name: z.string().optional(),
                description: z.string().optional(),
                pic: z.string().optional(),
                slotLength: z.string().optional(),
                numberOfSlots: z.number().optional(),
                price: z.number().optional()
            })
        )
        .optional()
        .describe('Appointment types array'),
    answers: z
        .array(
            z.object({
                code: z.string(),
                string: z.string()
            })
        )
        .optional()
        .describe('Answers matching the profile questions codes'),
    units: z.number().optional().describe('Number of units'),
    price: z.number().optional().describe('Price of the booking'),
    noShow: z.boolean().optional().describe('Whether the booking is marked as no-show'),
    cancelled: z.boolean().optional().describe('Whether the booking is cancelled'),
    linkFields: z.string().optional().describe('Link fields')
});

const ProviderTeamMemberSchema = z.object({
    id: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    pic: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    calendarId: z.string().optional().nullable()
});

const ProviderAppointmentTypeSchema = z.object({
    id: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    pic: z.string().optional().nullable(),
    slotLength: z.string().optional().nullable(),
    numberOfSlots: z.number().optional().nullable(),
    price: z.number().optional().nullable()
});

const ProviderAnswerSchema = z.object({
    code: z.string().optional().nullable(),
    string: z.string().optional().nullable()
});

const ProviderBookingSchema = z.object({
    id: z.string(),
    accountId: z.string().optional().nullable(),
    profileId: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    createdAt: z.string().optional().nullable(),
    updatedAt: z.string().optional().nullable(),
    startsAt: z.string(),
    endsAt: z.string(),
    noShow: z.boolean().optional().nullable(),
    locale: z.string().optional().nullable(),
    timeZone: z.string().optional().nullable(),
    rescheduledAt: z.string().optional().nullable(),
    cancelledAt: z.string().optional().nullable(),
    cancelled: z.boolean().optional().nullable(),
    acceptedAt: z.string().optional().nullable(),
    rejectedAt: z.string().optional().nullable(),
    noShowAt: z.string().optional().nullable(),
    cancelledBy: z.string().optional().nullable(),
    rescheduledBy: z.string().optional().nullable(),
    cancellationReason: z.string().optional().nullable(),
    cancellationCode: z.string().optional().nullable(),
    reviewAt: z.string().optional().nullable(),
    ref: z.string().optional().nullable(),
    units: z.number().optional().nullable(),
    price: z.number().optional().nullable(),
    currency: z.string().optional().nullable(),
    teamMember: ProviderTeamMemberSchema.optional().nullable(),
    appointmentTypes: z.array(ProviderAppointmentTypeSchema).optional().nullable(),
    answers: z.array(ProviderAnswerSchema).optional().nullable(),
    intentId: z.string().optional().nullable(),
    promotionCode: z.string().optional().nullable(),
    discount: z.number().optional().nullable(),
    linkFields: z.string().optional().nullable(),
    currencyFactor: z.number().optional().nullable(),
    teamMemberId: z.string().optional().nullable(),
    appointmentTypesIds: z.array(z.string()).optional().nullable(),
    cancellable: z.boolean().optional().nullable(),
    cancelReasonRequired: z.boolean().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    accountId: z.string().optional(),
    profileId: z.string().optional(),
    title: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    startsAt: z.string(),
    endsAt: z.string(),
    noShow: z.boolean().optional(),
    locale: z.string().optional(),
    timeZone: z.string().optional(),
    rescheduledAt: z.string().optional(),
    cancelledAt: z.string().optional(),
    cancelled: z.boolean().optional(),
    acceptedAt: z.string().optional(),
    rejectedAt: z.string().optional(),
    noShowAt: z.string().optional(),
    cancelledBy: z.string().optional(),
    rescheduledBy: z.string().optional(),
    cancellationReason: z.string().optional(),
    cancellationCode: z.string().optional(),
    reviewAt: z.string().optional(),
    ref: z.string().optional(),
    units: z.number().optional(),
    price: z.number().optional(),
    currency: z.string().optional(),
    teamMember: ProviderTeamMemberSchema.optional(),
    appointmentTypes: z.array(ProviderAppointmentTypeSchema).optional(),
    answers: z.array(ProviderAnswerSchema).optional(),
    intentId: z.string().optional(),
    promotionCode: z.string().optional(),
    discount: z.number().optional(),
    linkFields: z.string().optional(),
    currencyFactor: z.number().optional(),
    teamMemberId: z.string().optional(),
    appointmentTypesIds: z.array(z.string()).optional(),
    cancellable: z.boolean().optional(),
    cancelReasonRequired: z.boolean().optional()
});

const action = createAction({
    description: 'Directly create a confirmed booking against a profile',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://ycbm.stoplight.io/docs/youcanbookme-api/2a78a4ca016d7-create-booking
            endpoint: '/v1/bookings',
            data: {
                profileId: input.profileId,
                startsAt: input.startsAt,
                ...(input.endsAt !== undefined && { endsAt: input.endsAt }),
                ...(input.title !== undefined && { title: input.title }),
                ...(input.timeZone !== undefined && { timeZone: input.timeZone }),
                ...(input.locale !== undefined && { locale: input.locale }),
                ...(input.teamMemberId !== undefined && { teamMemberId: input.teamMemberId }),
                ...(input.appointmentTypesIds !== undefined && { appointmentTypesIds: input.appointmentTypesIds }),
                ...(input.teamMember !== undefined && { teamMember: input.teamMember }),
                ...(input.appointmentTypes !== undefined && { appointmentTypes: input.appointmentTypes }),
                ...(input.answers !== undefined && { answers: input.answers }),
                ...(input.units !== undefined && { units: input.units }),
                ...(input.price !== undefined && { price: input.price }),
                ...(input.noShow !== undefined && { noShow: input.noShow }),
                ...(input.cancelled !== undefined && { cancelled: input.cancelled }),
                ...(input.linkFields !== undefined && { linkFields: input.linkFields })
            },
            retries: 3
        });

        const providerBooking = ProviderBookingSchema.parse(response.data);

        return {
            id: providerBooking.id,
            ...(providerBooking.accountId != null && { accountId: providerBooking.accountId }),
            ...(providerBooking.profileId != null && { profileId: providerBooking.profileId }),
            ...(providerBooking.title != null && { title: providerBooking.title }),
            ...(providerBooking.createdAt != null && { createdAt: providerBooking.createdAt }),
            ...(providerBooking.updatedAt != null && { updatedAt: providerBooking.updatedAt }),
            startsAt: providerBooking.startsAt,
            endsAt: providerBooking.endsAt,
            ...(providerBooking.noShow != null && { noShow: providerBooking.noShow }),
            ...(providerBooking.locale != null && { locale: providerBooking.locale }),
            ...(providerBooking.timeZone != null && { timeZone: providerBooking.timeZone }),
            ...(providerBooking.rescheduledAt != null && { rescheduledAt: providerBooking.rescheduledAt }),
            ...(providerBooking.cancelledAt != null && { cancelledAt: providerBooking.cancelledAt }),
            ...(providerBooking.cancelled != null && { cancelled: providerBooking.cancelled }),
            ...(providerBooking.acceptedAt != null && { acceptedAt: providerBooking.acceptedAt }),
            ...(providerBooking.rejectedAt != null && { rejectedAt: providerBooking.rejectedAt }),
            ...(providerBooking.noShowAt != null && { noShowAt: providerBooking.noShowAt }),
            ...(providerBooking.cancelledBy != null && { cancelledBy: providerBooking.cancelledBy }),
            ...(providerBooking.rescheduledBy != null && { rescheduledBy: providerBooking.rescheduledBy }),
            ...(providerBooking.cancellationReason != null && { cancellationReason: providerBooking.cancellationReason }),
            ...(providerBooking.cancellationCode != null && { cancellationCode: providerBooking.cancellationCode }),
            ...(providerBooking.reviewAt != null && { reviewAt: providerBooking.reviewAt }),
            ...(providerBooking.ref != null && { ref: providerBooking.ref }),
            ...(providerBooking.units != null && { units: providerBooking.units }),
            ...(providerBooking.price != null && { price: providerBooking.price }),
            ...(providerBooking.currency != null && { currency: providerBooking.currency }),
            ...(providerBooking.teamMember != null && { teamMember: providerBooking.teamMember }),
            ...(providerBooking.appointmentTypes != null && { appointmentTypes: providerBooking.appointmentTypes }),
            ...(providerBooking.answers != null && { answers: providerBooking.answers }),
            ...(providerBooking.intentId != null && { intentId: providerBooking.intentId }),
            ...(providerBooking.promotionCode != null && { promotionCode: providerBooking.promotionCode }),
            ...(providerBooking.discount != null && { discount: providerBooking.discount }),
            ...(providerBooking.linkFields != null && { linkFields: providerBooking.linkFields }),
            ...(providerBooking.currencyFactor != null && { currencyFactor: providerBooking.currencyFactor }),
            ...(providerBooking.teamMemberId != null && { teamMemberId: providerBooking.teamMemberId }),
            ...(providerBooking.appointmentTypesIds != null && { appointmentTypesIds: providerBooking.appointmentTypesIds }),
            ...(providerBooking.cancellable != null && { cancellable: providerBooking.cancellable }),
            ...(providerBooking.cancelReasonRequired != null && { cancelReasonRequired: providerBooking.cancelReasonRequired })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
