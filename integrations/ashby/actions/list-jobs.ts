import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of items to return. The maximum and default value is 100.'),
    status: z.array(z.string()).optional().describe('Filter by job statuses such as Draft, Open, Closed, or Archived.'),
    openedAfter: z.number().optional().describe('Return jobs opened after this unix epoch timestamp in milliseconds.'),
    openedBefore: z.number().optional().describe('Return jobs opened before this unix epoch timestamp in milliseconds.'),
    closedAfter: z.number().optional().describe('Return jobs closed after this unix epoch timestamp in milliseconds.'),
    closedBefore: z.number().optional().describe('Return jobs closed before this unix epoch timestamp in milliseconds.'),
    includeUnpublishedJobPostingsIds: z.boolean().optional().describe('Include unpublished job posting ids in the response.')
});

const ProviderJobSchema = z.object({
    id: z.string(),
    title: z.string(),
    confidential: z.boolean(),
    status: z.string(),
    employmentType: z.string().nullish(),
    locationId: z.string().nullish(),
    departmentId: z.string().nullish(),
    defaultInterviewPlanId: z.string().nullish(),
    interviewPlanIds: z.array(z.string()).nullish(),
    customFields: z.array(z.unknown()).nullish(),
    jobPostingIds: z.array(z.string()).nullish(),
    customRequisitionId: z.string().nullish(),
    brandId: z.string().nullish(),
    hiringTeam: z.array(z.unknown()).nullish(),
    author: z.unknown().nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string(),
    openedAt: z.string().nullish(),
    closedAt: z.string().nullish()
});

const JobSchema = z.object({
    id: z.string(),
    title: z.string(),
    confidential: z.boolean(),
    status: z.string(),
    employmentType: z.string().optional(),
    locationId: z.string().optional(),
    departmentId: z.string().optional(),
    defaultInterviewPlanId: z.string().optional(),
    interviewPlanIds: z.array(z.string()).optional(),
    customFields: z.array(z.unknown()).optional(),
    jobPostingIds: z.array(z.string()).optional(),
    customRequisitionId: z.string().optional(),
    brandId: z.string().optional(),
    hiringTeam: z.array(z.unknown()).optional(),
    author: z.unknown().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string(),
    openedAt: z.string().optional(),
    closedAt: z.string().optional()
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    results: z.array(z.unknown()),
    moreDataAvailable: z.boolean(),
    nextCursor: z.string().optional(),
    syncToken: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(JobSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List jobs from Ashby.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-jobs',
        group: 'Jobs'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['jobsRead'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {};
        if (input.cursor !== undefined) {
            requestBody['cursor'] = input.cursor;
        }
        if (input.limit !== undefined) {
            requestBody['limit'] = input.limit;
        }
        if (input.status !== undefined) {
            requestBody['status'] = input.status;
        }
        if (input.openedAfter !== undefined) {
            requestBody['openedAfter'] = input.openedAfter;
        }
        if (input.openedBefore !== undefined) {
            requestBody['openedBefore'] = input.openedBefore;
        }
        if (input.closedAfter !== undefined) {
            requestBody['closedAfter'] = input.closedAfter;
        }
        if (input.closedBefore !== undefined) {
            requestBody['closedBefore'] = input.closedBefore;
        }
        if (input.includeUnpublishedJobPostingsIds !== undefined) {
            requestBody['includeUnpublishedJobPostingsIds'] = input.includeUnpublishedJobPostingsIds;
        }

        const response = await nango.post({
            // https://developers.ashbyhq.com/reference/joblist
            endpoint: '/job.list',
            data: requestBody,
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.parse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Ashby API returned a non-success response.'
            });
        }

        const items = parsedResponse.results.map((item) => {
            const raw = ProviderJobSchema.parse(item);
            return {
                id: raw.id,
                title: raw.title,
                confidential: raw.confidential,
                status: raw.status,
                updatedAt: raw.updatedAt,
                ...(raw.employmentType !== undefined && raw.employmentType !== null && { employmentType: raw.employmentType }),
                ...(raw.locationId !== undefined && raw.locationId !== null && { locationId: raw.locationId }),
                ...(raw.departmentId !== undefined && raw.departmentId !== null && { departmentId: raw.departmentId }),
                ...(raw.defaultInterviewPlanId !== undefined && raw.defaultInterviewPlanId !== null && { defaultInterviewPlanId: raw.defaultInterviewPlanId }),
                ...(raw.interviewPlanIds !== undefined && raw.interviewPlanIds !== null && { interviewPlanIds: raw.interviewPlanIds }),
                ...(raw.customFields !== undefined && raw.customFields !== null && { customFields: raw.customFields }),
                ...(raw.jobPostingIds !== undefined && raw.jobPostingIds !== null && { jobPostingIds: raw.jobPostingIds }),
                ...(raw.customRequisitionId !== undefined && raw.customRequisitionId !== null && { customRequisitionId: raw.customRequisitionId }),
                ...(raw.brandId !== undefined && raw.brandId !== null && { brandId: raw.brandId }),
                ...(raw.hiringTeam !== undefined && raw.hiringTeam !== null && { hiringTeam: raw.hiringTeam }),
                ...(raw.author !== undefined && raw.author !== null && { author: raw.author }),
                ...(raw.createdAt !== undefined && raw.createdAt !== null && { createdAt: raw.createdAt }),
                ...(raw.openedAt !== undefined && raw.openedAt !== null && { openedAt: raw.openedAt }),
                ...(raw.closedAt !== undefined && raw.closedAt !== null && { closedAt: raw.closedAt })
            };
        });

        return {
            items,
            ...(parsedResponse.nextCursor !== undefined && { next_cursor: parsedResponse.nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
