import { z } from 'zod';
import { createAction } from 'nango';

const AnswerSchema = z.object({
    code: z.string(),
    string: z.string().nullish()
});

const TeamMemberSchema = z.object({
    id: z.string().nullish(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    pic: z.string().nullish(),
    email: z.string().nullish(),
    calendarId: z.string().nullish()
});

const AppointmentTypeSchema = z.object({
    id: z.string().nullish(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    pic: z.string().nullish(),
    slotLength: z.string().nullish(),
    numberOfSlots: z.number().nullish(),
    price: z.number().nullish()
});

const ProviderBookingSchema = z.object({
    id: z.string(),
    title: z.string().nullish(),
    accountId: z.string().nullish(),
    profileId: z.string().nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish(),
    startsAt: z.string().nullish(),
    endsAt: z.string().nullish(),
    noShow: z.boolean().nullish(),
    locale: z.string().nullish(),
    timeZone: z.string().nullish(),
    rescheduledAt: z.string().nullish(),
    cancelledAt: z.string().nullish(),
    cancelled: z.boolean().nullish(),
    acceptedAt: z.string().nullish(),
    rejectedAt: z.string().nullish(),
    noShowAt: z.string().nullish(),
    cancelledBy: z.string().nullish(),
    rescheduledBy: z.string().nullish(),
    cancellationReason: z.string().nullish(),
    cancellationCode: z.string().nullish(),
    reviewAt: z.string().nullish(),
    ref: z.string().nullish(),
    units: z.number().nullish(),
    price: z.number().nullish(),
    currency: z.string().nullish(),
    teamMember: TeamMemberSchema.nullish(),
    appointmentTypes: z.array(AppointmentTypeSchema).nullish(),
    answers: z.array(AnswerSchema).nullish(),
    intentId: z.string().nullish(),
    promotionCode: z.string().nullish(),
    discount: z.number().nullish(),
    linkFields: z.string().nullish(),
    currencyFactor: z.number().nullish(),
    teamMemberId: z.string().nullish(),
    cancellable: z.boolean().nullish(),
    cancelReasonRequired: z.boolean().nullish(),
    appointmentTypesIds: z.array(z.string()).nullish()
});

const InputSchema = z
    .object({
        bookingId: z.string().min(1).describe('Booking ID. Example: "abc123"'),
        title: z.string().optional().describe('Updated booking title'),
        startsAt: z.string().optional().describe('Updated start time in ISO 8601 format. Example: "2026-07-30T09:00:00Z"'),
        endsAt: z.string().optional().describe('Updated end time in ISO 8601 format. Example: "2026-07-30T10:00:00Z"'),
        timeZone: z.string().optional().describe('Updated IANA time zone. Example: "America/Los_Angeles"'),
        teamMemberId: z.string().optional().describe('Updated team member ID'),
        appointmentTypesIds: z.array(z.string()).optional().describe('Updated appointment type IDs'),
        answers: z.array(AnswerSchema).optional().describe('Updated answers to profile questions'),
        locale: z.string().optional().describe('Updated locale. Example: "en_US"'),
        promotionCode: z.string().optional().describe('Updated promotion code'),
        discount: z.number().optional().describe('Updated discount amount'),
        cancellationReason: z.string().optional().describe('Reason for cancellation if cancelling'),
        noShow: z.boolean().optional().describe('Mark as no-show')
    })
    .refine(
        (input) =>
            input.title !== undefined ||
            input.startsAt !== undefined ||
            input.endsAt !== undefined ||
            input.timeZone !== undefined ||
            input.teamMemberId !== undefined ||
            input.appointmentTypesIds !== undefined ||
            input.answers !== undefined ||
            input.locale !== undefined ||
            input.promotionCode !== undefined ||
            input.discount !== undefined ||
            input.cancellationReason !== undefined ||
            input.noShow !== undefined,
        { message: 'At least one field besides bookingId must be provided to update the booking.' }
    );

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripNulls(value: unknown): unknown {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value.map(stripNulls).filter((item) => item !== undefined);
    }
    if (isPlainObject(value)) {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
            const stripped = stripNulls(val);
            if (stripped !== undefined) {
                result[key] = stripped;
            }
        }
        return result;
    }
    return value;
}

const action = createAction({
    description: 'Update or reschedule a booking.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: {
            title?: string;
            startsAt?: string;
            endsAt?: string;
            timeZone?: string;
            teamMemberId?: string;
            appointmentTypesIds?: string[];
            answers?: z.infer<typeof AnswerSchema>[];
            locale?: string;
            promotionCode?: string;
            discount?: number;
            cancellationReason?: string;
            noShow?: boolean;
        } = {};

        if (input.title !== undefined) {
            data.title = input.title;
        }
        if (input.startsAt !== undefined) {
            data.startsAt = input.startsAt;
        }
        if (input.endsAt !== undefined) {
            data.endsAt = input.endsAt;
        }
        if (input.timeZone !== undefined) {
            data.timeZone = input.timeZone;
        }
        if (input.teamMemberId !== undefined) {
            data.teamMemberId = input.teamMemberId;
        }
        if (input.appointmentTypesIds !== undefined) {
            data.appointmentTypesIds = input.appointmentTypesIds;
        }
        if (input.answers !== undefined) {
            data.answers = input.answers;
        }
        if (input.locale !== undefined) {
            data.locale = input.locale;
        }
        if (input.promotionCode !== undefined) {
            data.promotionCode = input.promotionCode;
        }
        if (input.discount !== undefined) {
            data.discount = input.discount;
        }
        if (input.cancellationReason !== undefined) {
            data.cancellationReason = input.cancellationReason;
        }
        if (input.noShow !== undefined) {
            data.noShow = input.noShow;
        }

        const response = await nango.patch({
            // https://api.youcanbook.me/v1/bookings/{bookingId}
            endpoint: `/v1/bookings/${encodeURIComponent(input.bookingId)}`,
            data,
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Booking not found or update failed',
                bookingId: input.bookingId
            });
        }

        const providerBooking = ProviderBookingSchema.parse(response.data);
        const stripped = stripNulls(providerBooking);
        return OutputSchema.parse(stripped);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
