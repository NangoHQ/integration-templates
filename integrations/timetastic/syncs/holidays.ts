import { createSync } from 'nango';
import { z } from 'zod';

const ProviderHolidaySchema = z.object({
    id: z.number().int(),
    startDate: z.string(),
    endDate: z.string(),
    userId: z.number().int(),
    leaveTypeId: z.number().int().optional(),
    status: z.string(),
    duration: z.number().optional(),
    deduction: z.number().optional(),
    reason: z.string().nullable().optional(),
    declineReason: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    autoApproved: z.boolean().optional(),
    bookingUnit: z.string().optional(),
    leaveType: z.string().nullable().optional(),
    startType: z.string().optional(),
    endType: z.string().optional(),
    userName: z.string().nullable().optional(),
    requestedById: z.number().int().optional(),
    actionerId: z.number().int().optional(),
    dateRangeString: z.string().nullable().optional(),
    startDateString: z.string().nullable().optional(),
    endDateString: z.string().nullable().optional(),
    adjustedStartDateUtc: z.string().nullable().optional(),
    adjustedEndDateUtc: z.string().nullable().optional()
});

const HolidaySchema = z.object({
    id: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    userId: z.number().int(),
    leaveTypeId: z.number().int().optional(),
    status: z.string(),
    duration: z.number().optional(),
    deduction: z.number().optional(),
    reason: z.string().optional(),
    declineReason: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    autoApproved: z.boolean().optional(),
    bookingUnit: z.string().optional(),
    leaveType: z.string().optional(),
    startType: z.string().optional(),
    endType: z.string().optional(),
    userName: z.string().optional(),
    requestedById: z.number().int().optional(),
    actionerId: z.number().int().optional(),
    dateRangeString: z.string().optional(),
    startDateString: z.string().optional(),
    endDateString: z.string().optional(),
    adjustedStartDateUtc: z.string().optional(),
    adjustedEndDateUtc: z.string().optional()
});

const CheckpointSchema = z.object({
    page_number: z.number().int().positive()
});

const ProviderHolidayPageSchema = z.object({
    holidays: z.array(ProviderHolidaySchema),
    totalRecords: z.number().int().optional(),
    pageNumber: z.number().int(),
    nextPageLink: z.string(),
    previousPageLink: z.string().optional()
});

const sync = createSync({
    description: 'Sync leave requests.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Holiday: HolidaySchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let pageNumber = checkpoint?.page_number ?? 1;

        // GET /holidays does not expose an updated-since filter, but it does support
        // page-number pagination, so we use a resumable full refresh and only finish
        // delete tracking after the final page is saved.
        if (!checkpoint || checkpoint.page_number <= 1) {
            await nango.trackDeletesStart('Holiday');
        }

        while (true) {
            const response = await nango.get({
                // https://timetastic.co.uk/api/ (interactive OpenAPI reference)
                endpoint: '/holidays',
                params: {
                    Status: 'Any',
                    PageNumber: pageNumber,
                    PageSize: 100
                },
                retries: 3
            });

            const parsedPage = ProviderHolidayPageSchema.safeParse(response.data);
            if (!parsedPage.success) {
                throw new Error(`Failed to parse holidays page: ${parsedPage.error.message}`);
            }

            const records = parsedPage.data.holidays.map((holiday) => ({
                id: String(holiday.id),
                startDate: holiday.startDate,
                endDate: holiday.endDate,
                userId: holiday.userId,
                ...(holiday.leaveTypeId !== undefined && { leaveTypeId: holiday.leaveTypeId }),
                status: holiday.status,
                ...(holiday.duration !== undefined && { duration: holiday.duration }),
                ...(holiday.deduction !== undefined && { deduction: holiday.deduction }),
                ...(holiday.reason != null && { reason: holiday.reason }),
                ...(holiday.declineReason != null && { declineReason: holiday.declineReason }),
                createdAt: holiday.createdAt,
                updatedAt: holiday.updatedAt,
                ...(holiday.autoApproved !== undefined && { autoApproved: holiday.autoApproved }),
                ...(holiday.bookingUnit !== undefined && { bookingUnit: holiday.bookingUnit }),
                ...(holiday.leaveType != null && { leaveType: holiday.leaveType }),
                ...(holiday.startType !== undefined && { startType: holiday.startType }),
                ...(holiday.endType !== undefined && { endType: holiday.endType }),
                ...(holiday.userName != null && { userName: holiday.userName }),
                ...(holiday.requestedById !== undefined && { requestedById: holiday.requestedById }),
                ...(holiday.actionerId !== undefined && { actionerId: holiday.actionerId }),
                ...(holiday.dateRangeString != null && { dateRangeString: holiday.dateRangeString }),
                ...(holiday.startDateString != null && { startDateString: holiday.startDateString }),
                ...(holiday.endDateString != null && { endDateString: holiday.endDateString }),
                ...(holiday.adjustedStartDateUtc != null && { adjustedStartDateUtc: holiday.adjustedStartDateUtc }),
                ...(holiday.adjustedEndDateUtc != null && { adjustedEndDateUtc: holiday.adjustedEndDateUtc })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Holiday');
            }

            if (parsedPage.data.nextPageLink === '') {
                await nango.clearCheckpoint();
                await nango.trackDeletesEnd('Holiday');
                break;
            }

            pageNumber = parsedPage.data.pageNumber + 1;
            await nango.saveCheckpoint({ page_number: pageNumber });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
