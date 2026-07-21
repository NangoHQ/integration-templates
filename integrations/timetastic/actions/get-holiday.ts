import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the holiday to retrieve. Example: 39587653'),
    filter: z.string().optional().describe('Optional filter string.')
});

const ProviderHolidaySchema = z.object({
    id: z.number(),
    dateRangeString: z.string().nullable().optional(),
    startDateString: z.string().nullable().optional(),
    endDateString: z.string().nullable().optional(),
    startDate: z.string().optional(),
    adjustedStartDateUtc: z.string().nullable().optional(),
    startType: z.enum(['Morning', 'Afternoon', 'Hours']).optional(),
    endDate: z.string().optional(),
    adjustedEndDateUtc: z.string().nullable().optional(),
    endType: z.enum(['Morning', 'Afternoon', 'Hours']).optional(),
    userId: z.number().optional(),
    userName: z.string().nullable().optional(),
    requestedById: z.number().optional(),
    leaveTypeId: z.number().optional(),
    duration: z.number().optional(),
    deduction: z.number().optional(),
    actionerId: z.number().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    reason: z.string().nullable().optional(),
    declineReason: z.string().nullable().optional(),
    status: z.enum(['Pending', 'Approved', 'Cancelled', 'Declined']).optional(),
    autoApproved: z.boolean().optional(),
    bookingUnit: z.enum(['Days', 'Hours']).optional(),
    leaveType: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    dateRangeString: z.string().optional(),
    startDateString: z.string().optional(),
    endDateString: z.string().optional(),
    startDate: z.string().optional(),
    adjustedStartDateUtc: z.string().optional(),
    startType: z.enum(['Morning', 'Afternoon', 'Hours']).optional(),
    endDate: z.string().optional(),
    adjustedEndDateUtc: z.string().optional(),
    endType: z.enum(['Morning', 'Afternoon', 'Hours']).optional(),
    userId: z.number().optional(),
    userName: z.string().optional(),
    requestedById: z.number().optional(),
    leaveTypeId: z.number().optional(),
    duration: z.number().optional(),
    deduction: z.number().optional(),
    actionerId: z.number().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    reason: z.string().optional(),
    declineReason: z.string().optional(),
    status: z.enum(['Pending', 'Approved', 'Cancelled', 'Declined']).optional(),
    autoApproved: z.boolean().optional(),
    bookingUnit: z.enum(['Days', 'Hours']).optional(),
    leaveType: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single leave request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://timetastic.co.uk/api/ (OpenAPI reference)
            endpoint: `/holidays/${encodeURIComponent(String(input.id))}`,
            params: {
                ...(input.filter !== undefined && { filter: input.filter })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Holiday with id ${input.id} not found.`
            });
        }

        const providerHoliday = ProviderHolidaySchema.parse(response.data);

        return {
            id: providerHoliday.id,
            ...(providerHoliday.dateRangeString != null && { dateRangeString: providerHoliday.dateRangeString }),
            ...(providerHoliday.startDateString != null && { startDateString: providerHoliday.startDateString }),
            ...(providerHoliday.endDateString != null && { endDateString: providerHoliday.endDateString }),
            ...(providerHoliday.startDate !== undefined && { startDate: providerHoliday.startDate }),
            ...(providerHoliday.adjustedStartDateUtc != null && { adjustedStartDateUtc: providerHoliday.adjustedStartDateUtc }),
            ...(providerHoliday.startType !== undefined && { startType: providerHoliday.startType }),
            ...(providerHoliday.endDate !== undefined && { endDate: providerHoliday.endDate }),
            ...(providerHoliday.adjustedEndDateUtc != null && { adjustedEndDateUtc: providerHoliday.adjustedEndDateUtc }),
            ...(providerHoliday.endType !== undefined && { endType: providerHoliday.endType }),
            ...(providerHoliday.userId !== undefined && { userId: providerHoliday.userId }),
            ...(providerHoliday.userName != null && { userName: providerHoliday.userName }),
            ...(providerHoliday.requestedById !== undefined && { requestedById: providerHoliday.requestedById }),
            ...(providerHoliday.leaveTypeId !== undefined && { leaveTypeId: providerHoliday.leaveTypeId }),
            ...(providerHoliday.duration !== undefined && { duration: providerHoliday.duration }),
            ...(providerHoliday.deduction !== undefined && { deduction: providerHoliday.deduction }),
            ...(providerHoliday.actionerId !== undefined && { actionerId: providerHoliday.actionerId }),
            ...(providerHoliday.createdAt !== undefined && { createdAt: providerHoliday.createdAt }),
            ...(providerHoliday.updatedAt !== undefined && { updatedAt: providerHoliday.updatedAt }),
            ...(providerHoliday.reason != null && { reason: providerHoliday.reason }),
            ...(providerHoliday.declineReason != null && { declineReason: providerHoliday.declineReason }),
            ...(providerHoliday.status !== undefined && { status: providerHoliday.status }),
            ...(providerHoliday.autoApproved !== undefined && { autoApproved: providerHoliday.autoApproved }),
            ...(providerHoliday.bookingUnit !== undefined && { bookingUnit: providerHoliday.bookingUnit }),
            ...(providerHoliday.leaveType != null && { leaveType: providerHoliday.leaveType })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
