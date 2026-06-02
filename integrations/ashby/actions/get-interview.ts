import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique id of the interview whose details will be fetched. Example: "3ae2b801-19f6-41ef-ad28-214bd731948f"')
});

const ProviderInterviewSchema = z.object({
    id: z.string(),
    title: z.string(),
    externalTitle: z.string().nullable().optional(),
    isArchived: z.boolean(),
    isDebrief: z.boolean().optional(),
    isFeedbackRequired: z.boolean(),
    isFeedbackRequested: z.boolean(),
    instructionsHtml: z.string().nullable().optional(),
    instructionsPlain: z.string().nullable().optional(),
    jobId: z.string().nullable().optional(),
    feedbackFormDefinitionId: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    externalTitle: z.string().optional(),
    isArchived: z.boolean(),
    isDebrief: z.boolean().optional(),
    isFeedbackRequired: z.boolean(),
    isFeedbackRequested: z.boolean(),
    instructionsHtml: z.string().optional(),
    instructionsPlain: z.string().optional(),
    jobId: z.string().optional(),
    feedbackFormDefinitionId: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single interview from Ashby.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-interview',
        group: 'Interviews'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['interviewsRead'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.ashbyhq.com/reference/interviewinfo
            endpoint: '/interview.info',
            data: {
                id: input.id
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Interview not found or invalid response from provider'
            });
        }

        const raw = response.data;
        if ('success' in raw && raw.success === false) {
            const errors = 'errors' in raw && raw.errors != null ? String(raw.errors) : 'Unknown provider error';
            throw new nango.ActionError({
                type: 'provider_error',
                message: errors
            });
        }

        if (!('results' in raw) || raw.results == null) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Interview not found',
                interview_id: input.id
            });
        }

        const providerInterview = ProviderInterviewSchema.parse(raw.results);

        return {
            id: providerInterview.id,
            title: providerInterview.title,
            ...(providerInterview.externalTitle != null && { externalTitle: providerInterview.externalTitle }),
            isArchived: providerInterview.isArchived,
            ...(providerInterview.isDebrief !== undefined && { isDebrief: providerInterview.isDebrief }),
            isFeedbackRequired: providerInterview.isFeedbackRequired,
            isFeedbackRequested: providerInterview.isFeedbackRequested,
            ...(providerInterview.instructionsHtml != null && { instructionsHtml: providerInterview.instructionsHtml }),
            ...(providerInterview.instructionsPlain != null && { instructionsPlain: providerInterview.instructionsPlain }),
            ...(providerInterview.jobId != null && { jobId: providerInterview.jobId }),
            ...(providerInterview.feedbackFormDefinitionId != null && { feedbackFormDefinitionId: providerInterview.feedbackFormDefinitionId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
