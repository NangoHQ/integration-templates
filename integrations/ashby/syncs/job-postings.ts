import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderJobPostingSchema = z.object({
    id: z.string(),
    title: z.string(),
    jobId: z.string(),
    departmentName: z.string(),
    teamName: z.string(),
    locationName: z.string(),
    locationIds: z.object({
        primaryLocationId: z.string(),
        secondaryLocationIds: z.array(z.string())
    }),
    workplaceType: z.string().nullable().optional(),
    employmentType: z.string(),
    isListed: z.boolean(),
    publishedDate: z.string(),
    applicationDeadline: z.string().nullable().optional(),
    externalLink: z.string().nullable().optional(),
    applyLink: z.string(),
    compensationTierSummary: z.string().nullable().optional(),
    shouldDisplayCompensationOnJobBoard: z.boolean(),
    updatedAt: z.string()
});

const JobPostingSchema = z.object({
    id: z.string(),
    title: z.string(),
    jobId: z.string(),
    departmentName: z.string(),
    teamName: z.string(),
    locationName: z.string(),
    locationIds: z.object({
        primaryLocationId: z.string(),
        secondaryLocationIds: z.array(z.string())
    }),
    workplaceType: z.string().optional(),
    employmentType: z.string(),
    isListed: z.boolean(),
    publishedDate: z.string(),
    applicationDeadline: z.string().optional(),
    externalLink: z.string().optional(),
    applyLink: z.string(),
    compensationTierSummary: z.string().optional(),
    shouldDisplayCompensationOnJobBoard: z.boolean(),
    updatedAt: z.string()
});

type ProviderJobPosting = z.infer<typeof ProviderJobPostingSchema>;

const sync = createSync({
    description: 'Sync job postings from Ashby.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/job-postings' }],
    models: {
        JobPosting: JobPostingSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('JobPosting');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.ashbyhq.com/reference/jobpostinglist
            endpoint: '/jobPosting.list',
            method: 'POST',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'nextCursor',
                response_path: 'results',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rawPostings: ProviderJobPosting[] = [];
            for (const record of page) {
                const parsed = ProviderJobPostingSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse job posting: ${parsed.error.message}`);
                }
                rawPostings.push(parsed.data);
            }

            if (rawPostings.length === 0) {
                continue;
            }

            const postings = rawPostings.map((posting) => ({
                id: posting.id,
                title: posting.title,
                jobId: posting.jobId,
                departmentName: posting.departmentName,
                teamName: posting.teamName,
                locationName: posting.locationName,
                locationIds: posting.locationIds,
                ...(posting.workplaceType != null && { workplaceType: posting.workplaceType }),
                employmentType: posting.employmentType,
                isListed: posting.isListed,
                publishedDate: posting.publishedDate,
                ...(posting.applicationDeadline != null && { applicationDeadline: posting.applicationDeadline }),
                ...(posting.externalLink != null && { externalLink: posting.externalLink }),
                applyLink: posting.applyLink,
                ...(posting.compensationTierSummary != null && { compensationTierSummary: posting.compensationTierSummary }),
                shouldDisplayCompensationOnJobBoard: posting.shouldDisplayCompensationOnJobBoard,
                updatedAt: posting.updatedAt
            }));

            await nango.batchSave(postings, 'JobPosting');
        }

        await nango.trackDeletesEnd('JobPosting');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
