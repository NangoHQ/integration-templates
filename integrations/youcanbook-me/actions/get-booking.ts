import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    bookingId: z.string().describe('The ID of the booking to retrieve. Example: "123"')
});

const AnswerSchema = z.object({
    code: z.string(),
    string: z.string().optional().nullable()
});

const TeamMemberSchema = z.object({
    id: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    pic: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    calendarId: z.string().optional().nullable()
});

const AppointmentTypeSchema = z.object({
    id: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    pic: z.string().optional().nullable(),
    slotLength: z.string().optional().nullable(),
    numberOfSlots: z.number().optional().nullable(),
    price: z.number().optional().nullable()
});

const ProviderBookingSchema = z
    .object({
        id: z.string(),
        title: z.string().optional().nullable(),
        accountId: z.string().optional().nullable(),
        profileId: z.string().optional().nullable(),
        createdAt: z.string().optional().nullable(),
        updatedAt: z.string().optional().nullable(),
        startsAt: z.string().optional().nullable(),
        endsAt: z.string().optional().nullable(),
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
        teamMember: TeamMemberSchema.optional().nullable(),
        appointmentTypes: z.array(AppointmentTypeSchema).optional().nullable(),
        answers: z.array(AnswerSchema).optional().nullable(),
        intentId: z.string().optional().nullable(),
        promotionCode: z.string().optional().nullable(),
        discount: z.number().optional().nullable(),
        linkFields: z.string().optional().nullable(),
        currencyFactor: z.number().optional().nullable(),
        teamMemberId: z.string().optional().nullable(),
        cancellable: z.boolean().optional().nullable(),
        cancelReasonRequired: z.boolean().optional().nullable(),
        appointmentTypesIds: z.array(z.string()).optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    accountId: z.string().optional(),
    profileId: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
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
    teamMember: TeamMemberSchema.optional(),
    appointmentTypes: z.array(AppointmentTypeSchema).optional(),
    answers: z.array(AnswerSchema).optional(),
    intentId: z.string().optional(),
    promotionCode: z.string().optional(),
    discount: z.number().optional(),
    linkFields: z.string().optional(),
    currencyFactor: z.number().optional(),
    teamMemberId: z.string().optional(),
    cancellable: z.boolean().optional(),
    cancelReasonRequired: z.boolean().optional(),
    appointmentTypesIds: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Get a single booking by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://ycbm.stoplight.io/docs/youcanbookme-api/j2yzoko7fo6kl-bookings
            endpoint: `/v1/bookings/${encodeURIComponent(input.bookingId)}`,
            retries: 3
        };

        const response = await nango.get(config);

        const booking = ProviderBookingSchema.parse(response.data);

        return {
            id: booking.id,
            ...(booking.title != null && { title: booking.title }),
            ...(booking.accountId != null && { accountId: booking.accountId }),
            ...(booking.profileId != null && { profileId: booking.profileId }),
            ...(booking.createdAt != null && { createdAt: booking.createdAt }),
            ...(booking.updatedAt != null && { updatedAt: booking.updatedAt }),
            ...(booking.startsAt != null && { startsAt: booking.startsAt }),
            ...(booking.endsAt != null && { endsAt: booking.endsAt }),
            ...(booking.noShow != null && { noShow: booking.noShow }),
            ...(booking.locale != null && { locale: booking.locale }),
            ...(booking.timeZone != null && { timeZone: booking.timeZone }),
            ...(booking.rescheduledAt != null && { rescheduledAt: booking.rescheduledAt }),
            ...(booking.cancelledAt != null && { cancelledAt: booking.cancelledAt }),
            ...(booking.cancelled != null && { cancelled: booking.cancelled }),
            ...(booking.acceptedAt != null && { acceptedAt: booking.acceptedAt }),
            ...(booking.rejectedAt != null && { rejectedAt: booking.rejectedAt }),
            ...(booking.noShowAt != null && { noShowAt: booking.noShowAt }),
            ...(booking.cancelledBy != null && { cancelledBy: booking.cancelledBy }),
            ...(booking.rescheduledBy != null && { rescheduledBy: booking.rescheduledBy }),
            ...(booking.cancellationReason != null && { cancellationReason: booking.cancellationReason }),
            ...(booking.cancellationCode != null && { cancellationCode: booking.cancellationCode }),
            ...(booking.reviewAt != null && { reviewAt: booking.reviewAt }),
            ...(booking.ref != null && { ref: booking.ref }),
            ...(booking.units != null && { units: booking.units }),
            ...(booking.price != null && { price: booking.price }),
            ...(booking.currency != null && { currency: booking.currency }),
            ...(booking.teamMember != null && { teamMember: booking.teamMember }),
            ...(booking.appointmentTypes != null && { appointmentTypes: booking.appointmentTypes }),
            ...(booking.answers != null && { answers: booking.answers }),
            ...(booking.intentId != null && { intentId: booking.intentId }),
            ...(booking.promotionCode != null && { promotionCode: booking.promotionCode }),
            ...(booking.discount != null && { discount: booking.discount }),
            ...(booking.linkFields != null && { linkFields: booking.linkFields }),
            ...(booking.currencyFactor != null && { currencyFactor: booking.currencyFactor }),
            ...(booking.teamMemberId != null && { teamMemberId: booking.teamMemberId }),
            ...(booking.cancellable != null && { cancellable: booking.cancellable }),
            ...(booking.cancelReasonRequired != null && { cancelReasonRequired: booking.cancelReasonRequired }),
            ...(booking.appointmentTypesIds != null && { appointmentTypesIds: booking.appointmentTypesIds })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
