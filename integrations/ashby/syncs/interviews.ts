import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderInterviewSchema = z.object({
    id: z.string(),
    title: z.string(),
    externalTitle: z.string().nullish(),
    isArchived: z.boolean(),
    isDebrief: z.boolean().nullish(),
    isFeedbackRequired: z.boolean(),
    isFeedbackRequested: z.boolean(),
    instructionsHtml: z.string().nullish(),
    instructionsPlain: z.string().nullish(),
    jobId: z.string().nullish(),
    feedbackFormDefinitionId: z.string()
});

const InterviewSchema = z.object({
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
    feedbackFormDefinitionId: z.string()
});

const PageResponseSchema = z.object({
    success: z.boolean().optional(),
    results: z.array(z.unknown()).optional(),
    moreDataAvailable: z.boolean(),
    nextCursor: z.string().optional(),
    syncToken: z.string().optional()
});

const CheckpointSchema = z.object({
    syncToken: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync interviews from Ashby.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Interview: InterviewSchema
    },
    // https://developers.ashbyhq.com/reference/interviewlist
    endpoints: [{ method: 'POST', path: '/syncs/interviews' }],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const syncToken = checkpoint?.['syncToken'];
        const nextCursor = checkpoint?.['cursor'];
        let nextSyncToken: string | undefined;
        let currentCursorForCheckpoint: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://developers.ashbyhq.com/reference/interviewlist
            endpoint: '/interview.list',
            method: 'POST',
            data: {
                includeArchived: true,
                includeNonSharedInterviews: true,
                ...(syncToken && { syncToken }),
                ...(nextCursor && { cursor: nextCursor }),
                limit: 100
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'nextCursor',
                response_path: 'results',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam, response }) => {
                    const pageData = PageResponseSchema.parse(response.data);
                    currentCursorForCheckpoint = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                    if (!pageData.moreDataAvailable && pageData.syncToken) {
                        nextSyncToken = pageData.syncToken;
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rawInterviews = z.array(ProviderInterviewSchema).parse(page);
            const interviews = rawInterviews.map((record) => ({
                id: record.id,
                title: record.title,
                ...(record.externalTitle != null && { externalTitle: record.externalTitle }),
                isArchived: record.isArchived,
                ...(record.isDebrief != null && { isDebrief: record.isDebrief }),
                isFeedbackRequired: record.isFeedbackRequired,
                isFeedbackRequested: record.isFeedbackRequested,
                ...(record.instructionsHtml != null && { instructionsHtml: record.instructionsHtml }),
                ...(record.instructionsPlain != null && { instructionsPlain: record.instructionsPlain }),
                ...(record.jobId != null && { jobId: record.jobId }),
                feedbackFormDefinitionId: record.feedbackFormDefinitionId
            }));
            if (interviews.length > 0) {
                await nango.batchSave(interviews, 'Interview');
            }

            if (nextSyncToken) {
                await nango.saveCheckpoint({ syncToken: nextSyncToken, cursor: '' });
            } else if (currentCursorForCheckpoint) {
                await nango.saveCheckpoint({
                    syncToken: syncToken || '',
                    cursor: currentCursorForCheckpoint
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
