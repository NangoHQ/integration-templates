import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The id of the job to fetch. Example: "abc123"'),
    includeUnpublishedJobPostingsIds: z.boolean().optional(),
    expand: z.array(z.enum(['location', 'openings'])).optional()
});

const JobSchema = z.object({
    id: z.string(),
    title: z.string(),
    confidential: z.boolean(),
    status: z.string().describe('Job status. Example: "Open"'),
    employmentType: z.string().describe('Employment type. Example: "FullTime"'),
    locationId: z.string().nullable().optional(),
    departmentId: z.string().nullable().optional(),
    defaultInterviewPlanId: z.string().nullable().optional(),
    interviewPlanIds: z.array(z.string()).nullable().optional(),
    customFields: z.array(z.unknown()).nullable().optional(),
    jobPostingIds: z.array(z.string()).nullable().optional(),
    customRequisitionId: z.string().nullable().optional(),
    brandId: z.string().nullable().optional(),
    hiringTeam: z.array(z.unknown()).nullable().optional(),
    author: z.unknown().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string(),
    openedAt: z.string().nullable().optional(),
    closedAt: z.string().nullable().optional(),
    location: z.unknown().nullable().optional(),
    openings: z.array(z.unknown()).nullable().optional(),
    compensation: z.unknown().nullable().optional()
});

const OutputSchema = JobSchema;

const action = createAction({
    description: 'Retrieve a single job from Ashby.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-job',
        group: 'Jobs'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['jobsRead'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.ashbyhq.com/reference/jobinfo
            endpoint: 'job.info',
            data: {
                id: input.id,
                ...(input.includeUnpublishedJobPostingsIds !== undefined && {
                    includeUnpublishedJobPostingsIds: input.includeUnpublishedJobPostingsIds
                }),
                ...(input.expand !== undefined && { expand: input.expand })
            },
            retries: 3
        });

        const wrapper = z
            .object({
                success: z.boolean(),
                results: JobSchema.optional()
            })
            .parse(response.data);

        if (!wrapper.success || !wrapper.results) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to retrieve job from Ashby'
            });
        }

        return wrapper.results;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
