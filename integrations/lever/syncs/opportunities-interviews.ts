import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LIMIT = 100;

const LeverOpportunityInterviewSchema = z.object({
    id: z.string(),
    panel: z.string(),
    subject: z.string(),
    note: z.string(),
    interviewers: z
        .object({
            email: z.string(),
            id: z.string(),
            name: z.string(),
            feedbackTemplate: z.string().nullable()
        })
        .array(),
    timezone: z.string(),
    createdAt: z.number(),
    date: z.number(),
    duration: z.number(),
    location: z.string().nullable(),
    feedbackTemplate: z.string().nullable(),
    feedbackForms: z.string().array(),
    feedbackReminder: z.string(),
    user: z.string(),
    stage: z.string(),
    canceledAt: z.number().nullable(),
    postings: z.string().array(),
    gcalEventUrl: z.string().nullable().optional()
});

type LeverOpportunityInterview = z.infer<typeof LeverOpportunityInterviewSchema>;

const OpportunityItemSchema = z.object({
    id: z.string()
});

const InterviewItemSchema = z.object({
    id: z.string(),
    panel: z.string(),
    subject: z.string(),
    note: z.string(),
    interviewers: z
        .object({
            email: z.string(),
            id: z.string(),
            name: z.string(),
            feedbackTemplate: z.string().nullable()
        })
        .array(),
    timezone: z.string(),
    createdAt: z.number(),
    date: z.number(),
    duration: z.number(),
    location: z.string().nullable(),
    feedbackTemplate: z.string().nullable(),
    feedbackForms: z.string().array(),
    feedbackReminder: z.string(),
    user: z.string(),
    stage: z.string(),
    canceledAt: z.number().nullable(),
    postings: z.string().array(),
    gcalEventUrl: z.string().nullable().optional()
});

const CheckpointSchema = z.object({
    opportunityOffset: z.string()
});

const sync = createSync({
    description: 'Fetches a list of all interviews for every single opportunity',
    version: '3.0.1',
    frequency: 'every 6 hours',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: z.object({}),
    models: {
        LeverOpportunityInterview: LeverOpportunityInterviewSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { opportunityOffset: '' });
        let opportunityOffset = checkpoint.opportunityOffset;
        let totalRecords = 0;

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('LeverOpportunityInterview');

        const opportunitiesConfig: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#list-all-opportunities
            endpoint: '/v1/opportunities',
            params: {
                limit: LIMIT,
                ...(opportunityOffset && { offset: opportunityOffset })
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'next',
                cursor_name_in_request: 'offset',
                limit_name_in_request: 'limit',
                response_path: 'data',
                limit: LIMIT,
                on_page: async ({ nextPageParam }) => {
                    opportunityOffset = typeof nextPageParam === 'string' ? nextPageParam : '';
                }
            },
            retries: 3
        };

        for await (const opportunityBatch of nango.paginate(opportunitiesConfig)) {
            const parsedOpportunities = z.array(OpportunityItemSchema).safeParse(opportunityBatch);
            if (!parsedOpportunities.success) {
                throw new Error(`Lever opportunities response did not match expected schema: ${parsedOpportunities.error.message}`);
            }

            for (const opportunity of parsedOpportunities.data) {
                const config: ProxyConfiguration = {
                    // https://hire.lever.co/developer/documentation#list-all-interviews
                    endpoint: `/v1/opportunities/${encodeURIComponent(opportunity.id)}/interviews`,
                    paginate: {
                        type: 'cursor',
                        cursor_path_in_response: 'next',
                        cursor_name_in_request: 'offset',
                        limit_name_in_request: 'limit',
                        response_path: 'data',
                        limit: LIMIT
                    },
                    retries: 3
                };
                for await (const interviewBatch of nango.paginate(config)) {
                    if (!Array.isArray(interviewBatch)) {
                        throw new Error('Unexpected non-array response from interviews list');
                    }
                    const mappedInterviews = interviewBatch.map((raw) => mapInterview(raw));
                    const batchSize = mappedInterviews.length;
                    totalRecords += batchSize;
                    await nango.log(`Saving batch of ${batchSize} interview(s) for opportunity ${opportunity.id} (total interviews: ${totalRecords})`);
                    await nango.batchSave(mappedInterviews, 'LeverOpportunityInterview');
                }
            }

            // Save unconditionally, including the empty string on the final page, so a stale
            // offset from a previous run's last page can't make the next run skip earlier
            // opportunities.
            await nango.saveCheckpoint({ opportunityOffset });
        }

        // Clear the checkpoint only after the last page has been saved, then close the
        // delete-tracking window opened by trackDeletesStart().
        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('LeverOpportunityInterview');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function mapInterview(raw: unknown): LeverOpportunityInterview {
    const interview = InterviewItemSchema.parse(raw);
    return {
        id: interview.id,
        panel: interview.panel,
        subject: interview.subject,
        note: interview.note,
        interviewers: interview.interviewers,
        timezone: interview.timezone,
        createdAt: interview.createdAt,
        date: interview.date,
        duration: interview.duration,
        location: interview.location,
        feedbackTemplate: interview.feedbackTemplate,
        feedbackForms: interview.feedbackForms,
        feedbackReminder: interview.feedbackReminder,
        user: interview.user,
        stage: interview.stage,
        canceledAt: interview.canceledAt,
        postings: interview.postings,
        gcalEventUrl: interview.gcalEventUrl
    };
}
