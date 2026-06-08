import { createSync } from 'nango';
import { z } from 'zod';

const ProviderJobOpeningSchema = z.object({
    id: z.number(),
    title: z
        .object({
            id: z.number().nullable(),
            label: z.string()
        })
        .optional(),
    postedDate: z.string().optional(),
    location: z
        .object({
            id: z.number(),
            label: z.string(),
            address: z.unknown()
        })
        .nullable()
        .optional(),
    department: z
        .object({
            id: z.number(),
            label: z.string()
        })
        .nullable()
        .optional(),
    status: z
        .object({
            id: z.number(),
            label: z.string()
        })
        .optional(),
    hiringLead: z
        .object({
            employeeId: z.number(),
            firstName: z.string(),
            lastName: z.string(),
            avatar: z.string().nullable(),
            jobTitle: z.unknown().nullable()
        })
        .nullable()
        .optional(),
    newApplicantsCount: z.number().nullable().optional(),
    activeApplicantsCount: z.number().nullable().optional(),
    totalApplicantsCount: z.number().nullable().optional(),
    postingUrl: z.string().nullable().optional()
});

const JobOpeningSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    titleId: z.string().optional(),
    postedDate: z.string().optional(),
    locationId: z.string().optional(),
    locationLabel: z.string().optional(),
    departmentId: z.string().optional(),
    departmentLabel: z.string().optional(),
    statusId: z.string().optional(),
    statusLabel: z.string().optional(),
    hiringLeadEmployeeId: z.string().optional(),
    hiringLeadFirstName: z.string().optional(),
    hiringLeadLastName: z.string().optional(),
    hiringLeadAvatar: z.string().optional(),
    newApplicantsCount: z.number().optional(),
    activeApplicantsCount: z.number().optional(),
    totalApplicantsCount: z.number().optional(),
    postingUrl: z.string().optional()
});

const sync = createSync({
    description: 'Sync job openings from the BambooHR ATS.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/job-openings'
        }
    ],
    models: {
        JobOpening: JobOpeningSchema
    },

    exec: async (nango) => {
        // Blocker: The Get Job Summaries endpoint returns all non-deleted job openings
        // with no changed-since filter, no deleted-record endpoint, no resumable cursor,
        // and no documented pagination metadata.
        await nango.trackDeletesStart('JobOpening');

        // https://documentation.bamboohr.com/reference/get-job-summaries
        const response = await nango.get({
            endpoint: '/v1/applicant_tracking/jobs',
            params: {
                sortBy: 'created',
                sortOrder: 'ASC'
            },
            retries: 3
        });

        const parsedArray = z.array(z.unknown()).safeParse(response.data);

        if (!parsedArray.success) {
            throw new Error(`Failed to parse job openings response: ${parsedArray.error.message}`);
        }

        const jobOpenings = [];

        for (const record of parsedArray.data) {
            const parsed = ProviderJobOpeningSchema.safeParse(record);

            if (!parsed.success) {
                throw new Error(`Failed to parse job opening: ${parsed.error.message}`);
            }

            const job = parsed.data;

            jobOpenings.push({
                id: String(job.id),
                ...(job.title?.label !== undefined && { title: job.title.label }),
                ...(job.title?.id !== null && job.title?.id !== undefined && { titleId: String(job.title.id) }),
                ...(job.postedDate !== undefined && { postedDate: job.postedDate }),
                ...(job.location?.id !== undefined && { locationId: String(job.location.id) }),
                ...(job.location?.label !== undefined && { locationLabel: job.location.label }),
                ...(job.department?.id !== undefined && { departmentId: String(job.department.id) }),
                ...(job.department?.label !== undefined && { departmentLabel: job.department.label }),
                ...(job.status?.id !== undefined && { statusId: String(job.status.id) }),
                ...(job.status?.label !== undefined && { statusLabel: job.status.label }),
                ...(job.hiringLead?.employeeId !== undefined && { hiringLeadEmployeeId: String(job.hiringLead.employeeId) }),
                ...(job.hiringLead?.firstName !== undefined && { hiringLeadFirstName: job.hiringLead.firstName }),
                ...(job.hiringLead?.lastName !== undefined && { hiringLeadLastName: job.hiringLead.lastName }),
                ...(job.hiringLead?.avatar !== null && job.hiringLead?.avatar !== undefined && { hiringLeadAvatar: job.hiringLead.avatar }),
                ...(job.newApplicantsCount !== null && job.newApplicantsCount !== undefined && { newApplicantsCount: job.newApplicantsCount }),
                ...(job.activeApplicantsCount !== null && job.activeApplicantsCount !== undefined && { activeApplicantsCount: job.activeApplicantsCount }),
                ...(job.totalApplicantsCount !== null && job.totalApplicantsCount !== undefined && { totalApplicantsCount: job.totalApplicantsCount }),
                ...(job.postingUrl !== null && job.postingUrl !== undefined && { postingUrl: job.postingUrl })
            });
        }

        if (jobOpenings.length > 0) {
            await nango.batchSave(jobOpenings, 'JobOpening');
        }

        await nango.trackDeletesEnd('JobOpening');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
