import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    location: z.string().optional().describe('Filter by location name (case sensitive)'),
    department: z.string().optional().describe('Filter by department name (case sensitive)'),
    listedOnly: z.boolean().optional().describe('If true, filter out unlisted job postings'),
    jobBoardId: z.string().optional().describe('If provided, only returns job postings on the specified job board')
});

const LocationIdsSchema = z.object({
    primaryLocationId: z.string(),
    secondaryLocationIds: z.array(z.string())
});

const JobPostingSchema = z.object({
    id: z.string(),
    title: z.string(),
    jobId: z.string(),
    departmentName: z.string(),
    teamName: z.string(),
    locationName: z.string(),
    locationIds: LocationIdsSchema,
    workplaceType: z.string().nullable().optional(),
    employmentType: z.string(),
    isListed: z.boolean(),
    publishedDate: z.string(),
    applicationDeadline: z.string().optional().nullable(),
    externalLink: z.string().optional().nullable(),
    applyLink: z.string(),
    compensationTierSummary: z.string().optional().nullable(),
    shouldDisplayCompensationOnJobBoard: z.boolean(),
    updatedAt: z.string()
});

const ListOutputSchema = z.object({
    items: z.array(JobPostingSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List job postings from Ashby',
    version: '1.0.1',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['jobsRead'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const response = await nango.post({
            // https://developers.ashbyhq.com/reference/jobpostinglist
            endpoint: '/jobPosting.list',
            data: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.location !== undefined && { location: input.location }),
                ...(input.department !== undefined && { department: input.department }),
                ...(input.listedOnly !== undefined && { listedOnly: input.listedOnly }),
                ...(input.jobBoardId !== undefined && { jobBoardId: input.jobBoardId })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            success: z.boolean(),
            results: z.array(z.unknown()).optional(),
            moreDataAvailable: z.boolean().optional(),
            nextCursor: z.string().optional()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Failed to list job postings from Ashby'
            });
        }

        const items = (providerResponse.results ?? []).map((item: unknown) => {
            return JobPostingSchema.parse(item);
        });

        return {
            items,
            ...(providerResponse.nextCursor != null && { nextCursor: providerResponse.nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
