import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    opportunityId: z.string().describe('Opportunity ID. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    interviewId: z.string().describe('Interview ID. Example: "32b7bf78-4592-4a56-b313-3e31ed25ea00"')
});

const InterviewerSchema = z.object({
    email: z.string(),
    id: z.string(),
    name: z.string(),
    feedbackTemplate: z.string()
});

const ConferenceEntryPointSchema = z.object({
    type: z.string(),
    uri: z.string()
});

const ConferenceSchema = z.object({
    source: z.string(),
    entryPoints: z.array(ConferenceEntryPointSchema)
});

const ProviderInterviewSchema = z.object({
    id: z.string(),
    panel: z.string(),
    subject: z.string(),
    note: z.string(),
    interviewers: z.array(InterviewerSchema),
    timezone: z.string(),
    createdAt: z.number(),
    date: z.number(),
    duration: z.number(),
    location: z.string().nullable(),
    feedbackTemplate: z.string().nullable(),
    feedbackForms: z.array(z.string()),
    feedbackReminder: z.string(),
    user: z.string(),
    stage: z.string(),
    canceledAt: z.number().nullable(),
    postings: z.array(z.string()),
    conferences: z.array(ConferenceSchema).optional(),
    gcalEventUrl: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    panel: z.string(),
    subject: z.string(),
    note: z.string(),
    interviewers: z.array(InterviewerSchema),
    timezone: z.string(),
    createdAt: z.number(),
    date: z.number(),
    duration: z.number(),
    location: z.string().optional(),
    feedbackTemplate: z.string().optional(),
    feedbackForms: z.array(z.string()),
    feedbackReminder: z.string(),
    user: z.string(),
    stage: z.string(),
    canceledAt: z.number().optional(),
    postings: z.array(z.string()),
    conferences: z.array(ConferenceSchema).optional(),
    gcalEventUrl: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single interview on an opportunity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['interviews:read:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#retrieve-a-single-interview
            endpoint: `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/interviews/${encodeURIComponent(input.interviewId)}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (typeof response.data !== 'object' || response.data === null || !('data' in response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Interview not found',
                opportunityId: input.opportunityId,
                interviewId: input.interviewId
            });
        }

        const providerInterview = ProviderInterviewSchema.parse(response.data.data);

        return {
            id: providerInterview.id,
            panel: providerInterview.panel,
            subject: providerInterview.subject,
            note: providerInterview.note,
            interviewers: providerInterview.interviewers,
            timezone: providerInterview.timezone,
            createdAt: providerInterview.createdAt,
            date: providerInterview.date,
            duration: providerInterview.duration,
            ...(providerInterview.location != null && { location: providerInterview.location }),
            ...(providerInterview.feedbackTemplate != null && { feedbackTemplate: providerInterview.feedbackTemplate }),
            feedbackForms: providerInterview.feedbackForms,
            feedbackReminder: providerInterview.feedbackReminder,
            user: providerInterview.user,
            stage: providerInterview.stage,
            ...(providerInterview.canceledAt != null && { canceledAt: providerInterview.canceledAt }),
            postings: providerInterview.postings,
            ...(providerInterview.conferences !== undefined && { conferences: providerInterview.conferences }),
            ...(providerInterview.gcalEventUrl != null && { gcalEventUrl: providerInterview.gcalEventUrl })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
