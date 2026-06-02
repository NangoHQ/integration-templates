import { z } from 'zod';
import { createAction } from 'nango';

const ProviderInterviewSchema = z.object({
    id: z.string(),
    title: z.string(),
    externalTitle: z.string(),
    isArchived: z.boolean(),
    isDebrief: z.boolean(),
    isFeedbackRequired: z.boolean(),
    isFeedbackRequested: z.boolean(),
    instructionsHtml: z.string().nullable(),
    instructionsPlain: z.string().nullable(),
    feedbackFormDefinitionId: z.string().nullable()
});

const InterviewOutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    externalTitle: z.string(),
    isArchived: z.boolean(),
    isDebrief: z.boolean(),
    isFeedbackRequired: z.boolean(),
    isFeedbackRequested: z.boolean(),
    instructionsHtml: z.string().optional(),
    instructionsPlain: z.string().optional(),
    feedbackFormDefinitionId: z.string().optional()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('The maximum number of items to return. The maximum and default value is 100.'),
    includeArchived: z.boolean().optional().describe('When true, includes archived items.'),
    includeNonSharedInterviews: z.boolean().optional().describe('If true, interviews associated with specific jobs will be included in the response.'),
    excludeArchivedScheduleTemplateInterviews: z
        .boolean()
        .optional()
        .describe('If true, interviews local to archived schedule templates are omitted from the response.')
});

const OutputSchema = z.object({
    items: z.array(InterviewOutputSchema),
    next_cursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    results: z.array(ProviderInterviewSchema).optional(),
    moreDataAvailable: z.boolean().optional(),
    nextCursor: z.string().optional(),
    syncToken: z.string().optional()
});

const action = createAction({
    description: 'List interviews from Ashby.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-interviews',
        group: 'Interviews'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['interviewsRead'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.ashbyhq.com/reference/interviewlist
            endpoint: 'interview.list',
            data: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.includeArchived !== undefined && { includeArchived: input.includeArchived }),
                ...(input.includeNonSharedInterviews !== undefined && { includeNonSharedInterviews: input.includeNonSharedInterviews }),
                ...(input.excludeArchivedScheduleTemplateInterviews !== undefined && {
                    excludeArchivedScheduleTemplateInterviews: input.excludeArchivedScheduleTemplateInterviews
                })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Ashby API returned a failure response.'
            });
        }

        return {
            items: (providerResponse.results ?? []).map((item) => ({
                id: item.id,
                title: item.title,
                externalTitle: item.externalTitle,
                isArchived: item.isArchived,
                isDebrief: item.isDebrief,
                isFeedbackRequired: item.isFeedbackRequired,
                isFeedbackRequested: item.isFeedbackRequested,
                ...(item.instructionsHtml !== null && { instructionsHtml: item.instructionsHtml }),
                ...(item.instructionsPlain !== null && { instructionsPlain: item.instructionsPlain }),
                ...(item.feedbackFormDefinitionId !== null && { feedbackFormDefinitionId: item.feedbackFormDefinitionId })
            })),
            ...(providerResponse.nextCursor !== undefined && { next_cursor: providerResponse.nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
