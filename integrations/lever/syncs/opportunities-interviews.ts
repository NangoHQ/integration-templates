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

const sync = createSync({
    description: 'Fetches a list of all interviews for every single opportunity',
    version: '3.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'full',
    metadata: z.object({}),
    models: {
        LeverOpportunityInterview: LeverOpportunityInterviewSchema
    },

    exec: async (nango) => {
        let totalRecords = 0;

        const opportunities = await getAllOpportunities(nango);

        for (const opportunity of opportunities) {
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
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function getAllOpportunities(nango: NangoSyncLocal) {
    const records: Array<{ id: string }> = [];
    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#list-all-opportunities
        endpoint: '/v1/opportunities',
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

    for await (const recordBatch of nango.paginate(config)) {
        if (!Array.isArray(recordBatch)) {
            throw new Error('Unexpected non-array response from opportunities list');
        }
        for (const raw of recordBatch) {
            const parsed = OpportunityItemSchema.parse(raw);
            records.push(parsed);
        }
    }

    return records;
}

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
