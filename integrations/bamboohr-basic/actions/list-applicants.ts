import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    job_id: z.number().optional().describe('A Job ID to limit results to.'),
    application_status_id: z.string().optional().describe('One or more application status IDs to filter by, comma-separated (e.g. "1,2,3").'),
    application_status: z
        .string()
        .optional()
        .describe(
            'One or more application status group codes to filter by, comma-separated (e.g. "NEW,ACTIVE"). Allowed values: ALL, ALL_ACTIVE, NEW, ACTIVE, INACTIVE, HIRED.'
        ),
    job_status_groups: z
        .string()
        .optional()
        .describe(
            'One or more position status groups to filter by, comma-separated (e.g. "Draft,Open"). Allowed values: ALL, DRAFT_AND_OPEN, Open, Filled, Draft, Deleted, On Hold, Canceled.'
        ),
    search_string: z.string().optional().describe('A general search criteria by which to find applications.'),
    sort_by: z
        .string()
        .optional()
        .describe('A specific field to sort the results by. Allowed values: first_name, job_title, rating, phone, status, last_updated, created_date.'),
    sort_order: z.string().optional().describe('Order by which to sort results. Allowed values: ASC, DESC.'),
    new_since: z.string().optional().describe('Only return applications submitted after this UTC timestamp. Format: Y-m-d H:i:s (e.g. "2024-01-01 13:00:00").')
});

const ProviderApplicationStatusSchema = z.object({
    id: z.number().optional(),
    label: z.string().nullable().optional()
});

const ProviderApplicantSchema = z.object({
    id: z.number().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    avatar: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    source: z.string().nullable().optional()
});

const ProviderJobTitleSchema = z.object({
    id: z.number().nullable().optional(),
    label: z.string().nullable().optional()
});

const ProviderJobSchema = z.object({
    id: z.number().optional(),
    title: ProviderJobTitleSchema.optional()
});

const ProviderApplicationSchema = z.object({
    id: z.number().optional(),
    appliedDate: z.string().optional(),
    status: ProviderApplicationStatusSchema.optional(),
    rating: z.number().nullable().optional(),
    applicant: ProviderApplicantSchema.optional(),
    job: ProviderJobSchema.optional()
});

const ProviderResponseSchema = z.object({
    paginationComplete: z.boolean().optional(),
    nextPageUrl: z.string().nullable().optional(),
    applications: z.array(ProviderApplicationSchema).optional()
});

const ApplicationStatusSchema = z.object({
    id: z.number().optional(),
    label: z.string().optional()
});

const ApplicantSchema = z.object({
    id: z.number().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    avatar: z.string().optional(),
    email: z.string().optional(),
    source: z.string().optional()
});

const JobTitleSchema = z.object({
    id: z.number().optional(),
    label: z.string().optional()
});

const JobSchema = z.object({
    id: z.number().optional(),
    title: JobTitleSchema.optional()
});

const ApplicationSchema = z.object({
    id: z.number().optional(),
    applied_date: z.string().optional(),
    status: ApplicationStatusSchema.optional(),
    rating: z.number().optional(),
    applicant: ApplicantSchema.optional(),
    job: JobSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(ApplicationSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List applicants from the BambooHR ATS.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-applicants',
        group: 'Applicant Tracking'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer page number'
            });
        }

        // https://documentation.bamboohr.com/reference/get-applications
        const response = await nango.get({
            endpoint: '/v1/applicant_tracking/applications',
            params: {
                page: String(page),
                ...(input.job_id !== undefined && { jobId: String(input.job_id) }),
                ...(input.application_status_id !== undefined && { applicationStatusId: input.application_status_id }),
                ...(input.application_status !== undefined && { applicationStatus: input.application_status }),
                ...(input.job_status_groups !== undefined && { jobStatusGroups: input.job_status_groups }),
                ...(input.search_string !== undefined && { searchString: input.search_string }),
                ...(input.sort_by !== undefined && { sortBy: input.sort_by }),
                ...(input.sort_order !== undefined && { sortOrder: input.sort_order }),
                ...(input.new_since !== undefined && { newSince: input.new_since })
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        const items = (providerData.applications || []).map((app) => ({
            ...(app.id !== undefined && { id: app.id }),
            ...(app.appliedDate !== undefined && { applied_date: app.appliedDate }),
            ...(app.status !== undefined && {
                status: {
                    ...(app.status.id !== undefined && { id: app.status.id }),
                    ...(app.status.label != null && { label: app.status.label })
                }
            }),
            ...(app.rating != null && { rating: app.rating }),
            ...(app.applicant !== undefined && {
                applicant: {
                    ...(app.applicant.id !== undefined && { id: app.applicant.id }),
                    ...(app.applicant.firstName != null && { first_name: app.applicant.firstName }),
                    ...(app.applicant.lastName != null && { last_name: app.applicant.lastName }),
                    ...(app.applicant.avatar != null && { avatar: app.applicant.avatar }),
                    ...(app.applicant.email != null && { email: app.applicant.email }),
                    ...(app.applicant.source != null && { source: app.applicant.source })
                }
            }),
            ...(app.job !== undefined && {
                job: {
                    ...(app.job.id !== undefined && { id: app.job.id }),
                    ...(app.job.title !== undefined && {
                        title: {
                            ...(app.job.title.id != null && { id: app.job.title.id }),
                            ...(app.job.title.label != null && { label: app.job.title.label })
                        }
                    })
                }
            })
        }));

        const nextCursor = providerData.paginationComplete === false ? String(page + 1) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
