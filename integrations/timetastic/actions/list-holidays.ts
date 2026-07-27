import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    departmentId: z.number().optional().describe('Filter holidays by a department ID. Example: 248819'),
    leaveTypeId: z.number().optional().describe('Filter holidays by a leave type ID. Example: 586853'),
    departmentManagersOnly: z.boolean().optional().describe('Only include holidays for department managers'),
    myTeamOnly: z.number().optional().describe('Filter holidays for a specific team user ID'),
    myFavouritesOnly: z.number().optional().describe('Filter holidays for favourite users of the given user ID'),
    userIds: z.string().optional().describe('Comma-separated user IDs to include. Example: "1522999,1523000"'),
    exclusionUserIds: z.string().optional().describe('Comma-separated user IDs to exclude. Example: "1523000"'),
    nonArchivedUsersOnly: z.boolean().optional().describe('Only return holidays for non-archived users'),
    start: z.string().optional().describe('Filter holidays on or after this date. Example: "2026-01-01"'),
    end: z.string().optional().describe('Filter holidays before and including this date. Example: "2026-12-31"'),
    transactionYear: z.number().optional().describe('Filter holidays by transaction year. Example: 2026'),
    status: z.enum(['PendingOrApproved', 'Pending', 'Approved', 'Cancelled', 'Declined', 'Any']).optional().describe('Filter by holiday status'),
    approverId: z.number().optional().describe('Filter holidays by approver user ID. Example: 1522999'),
    pageNumber: z.number().optional().describe('Page number for pagination. Example: 1')
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

const ProviderResponseSchema = z.object({
    holidays: z.array(ProviderHolidaySchema).nullable().optional(),
    totalRecords: z.number().optional(),
    pageNumber: z.number().optional(),
    nextPageLink: z.string().nullable().optional(),
    previousPageLink: z.string().nullable().optional()
});

const HolidaySchema = z.object({
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

const OutputSchema = z.object({
    holidays: z.array(HolidaySchema),
    totalRecords: z.number(),
    pageNumber: z.number(),
    nextPageLink: z.string(),
    previousPageLink: z.string()
});

const action = createAction({
    description: 'Query leave requests for the organisation with rich filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://timetastic.co.uk/api/ (interactive OpenAPI reference)
            // https://app.timetastic.co.uk/swagger/v1/swagger.json
            endpoint: '/holidays',
            params: {
                ...(input.departmentId !== undefined && { DepartmentId: String(input.departmentId) }),
                ...(input.leaveTypeId !== undefined && { LeaveTypeId: String(input.leaveTypeId) }),
                ...(input.departmentManagersOnly !== undefined && { DepartmentManagersOnly: String(input.departmentManagersOnly) }),
                ...(input.myTeamOnly !== undefined && { MyTeamOnly: String(input.myTeamOnly) }),
                ...(input.myFavouritesOnly !== undefined && { MyFavouritesOnly: String(input.myFavouritesOnly) }),
                ...(input.userIds !== undefined && { UserIds: input.userIds }),
                ...(input.exclusionUserIds !== undefined && { ExclusionUserIds: input.exclusionUserIds }),
                ...(input.nonArchivedUsersOnly !== undefined && { NonArchivedUsersOnly: String(input.nonArchivedUsersOnly) }),
                ...(input.start !== undefined && { Start: input.start }),
                ...(input.end !== undefined && { End: input.end }),
                ...(input.transactionYear !== undefined && { TransactionYear: String(input.transactionYear) }),
                ...(input.status !== undefined && { Status: input.status }),
                ...(input.approverId !== undefined && { ApproverId: String(input.approverId) }),
                ...(input.pageNumber !== undefined && { PageNumber: String(input.pageNumber) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const holidays = (providerResponse.holidays ?? []).map((holiday) => ({
            id: holiday.id,
            ...(holiday.dateRangeString != null && { dateRangeString: holiday.dateRangeString }),
            ...(holiday.startDateString != null && { startDateString: holiday.startDateString }),
            ...(holiday.endDateString != null && { endDateString: holiday.endDateString }),
            ...(holiday.startDate !== undefined && { startDate: holiday.startDate }),
            ...(holiday.adjustedStartDateUtc != null && { adjustedStartDateUtc: holiday.adjustedStartDateUtc }),
            ...(holiday.startType !== undefined && { startType: holiday.startType }),
            ...(holiday.endDate !== undefined && { endDate: holiday.endDate }),
            ...(holiday.adjustedEndDateUtc != null && { adjustedEndDateUtc: holiday.adjustedEndDateUtc }),
            ...(holiday.endType !== undefined && { endType: holiday.endType }),
            ...(holiday.userId !== undefined && { userId: holiday.userId }),
            ...(holiday.userName != null && { userName: holiday.userName }),
            ...(holiday.requestedById !== undefined && { requestedById: holiday.requestedById }),
            ...(holiday.leaveTypeId !== undefined && { leaveTypeId: holiday.leaveTypeId }),
            ...(holiday.duration !== undefined && { duration: holiday.duration }),
            ...(holiday.deduction !== undefined && { deduction: holiday.deduction }),
            ...(holiday.actionerId !== undefined && { actionerId: holiday.actionerId }),
            ...(holiday.createdAt !== undefined && { createdAt: holiday.createdAt }),
            ...(holiday.updatedAt !== undefined && { updatedAt: holiday.updatedAt }),
            ...(holiday.reason != null && { reason: holiday.reason }),
            ...(holiday.declineReason != null && { declineReason: holiday.declineReason }),
            ...(holiday.status !== undefined && { status: holiday.status }),
            ...(holiday.autoApproved !== undefined && { autoApproved: holiday.autoApproved }),
            ...(holiday.bookingUnit !== undefined && { bookingUnit: holiday.bookingUnit }),
            ...(holiday.leaveType != null && { leaveType: holiday.leaveType })
        }));

        return {
            holidays,
            totalRecords: providerResponse.totalRecords ?? 0,
            pageNumber: providerResponse.pageNumber ?? 0,
            nextPageLink: providerResponse.nextPageLink ?? '',
            previousPageLink: providerResponse.previousPageLink ?? ''
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
