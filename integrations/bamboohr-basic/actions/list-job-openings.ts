import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    status_groups: z
        .string()
        .optional()
        .describe('One or more status groups to filter by, comma-separated. Allowed: ALL, DRAFT_AND_OPEN, Open, Filled, Draft, Deleted, On Hold, Canceled'),
    status_ids: z.string().optional().describe('One or more status IDs to filter by, comma-separated'),
    sort_by: z.enum(['count', 'title', 'lead', 'created', 'status']).optional(),
    sort_order: z.enum(['ASC', 'DESC']).optional(),
    cursor: z.string().optional().describe('Pagination cursor')
});

const JobTitleSchema = z.object({
    id: z.number().nullable().optional(),
    label: z.string().optional()
});

const JobLocationSchema = z.object({
    id: z.number().optional(),
    label: z.string().optional(),
    address: z.record(z.string(), z.unknown()).optional()
});

const JobDepartmentSchema = z.object({
    id: z.number().optional(),
    label: z.string().optional()
});

const JobStatusSchema = z.object({
    id: z.number().optional(),
    label: z.string().optional()
});

const HiringLeadSchema = z.object({
    employeeId: z.number().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    avatar: z.string().nullable().optional(),
    jobTitle: z.record(z.string(), z.unknown()).nullable().optional()
});

const JobOpeningSchema = z.object({
    id: z.number(),
    title: JobTitleSchema.optional(),
    postedDate: z.string().optional(),
    location: JobLocationSchema.optional(),
    department: JobDepartmentSchema.optional(),
    status: JobStatusSchema.optional(),
    hiringLead: HiringLeadSchema.optional(),
    newApplicantsCount: z.number().nullable().optional(),
    activeApplicantsCount: z.number().nullable().optional(),
    totalApplicantsCount: z.number().nullable().optional(),
    postingUrl: z.string().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(JobOpeningSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List job openings from the BambooHR ATS.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-job-openings',
        group: 'Applicant Tracking'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/get-job-summaries
            endpoint: '/v1/applicant_tracking/jobs',
            params: {
                ...(input.status_groups !== undefined && { statusGroups: input.status_groups }),
                ...(input.status_ids !== undefined && { status_ids: input.status_ids }),
                ...(input.sort_by !== undefined && { sortBy: input.sort_by }),
                ...(input.sort_order !== undefined && { sortOrder: input.sort_order }),
                ...(input.cursor !== undefined && { page: input.cursor })
            },
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of job openings from the BambooHR API'
            });
        }

        const parseResult = z.array(JobOpeningSchema).safeParse(response.data);
        if (!parseResult.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse job openings response from the BambooHR API'
            });
        }

        return {
            items: parseResult.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
