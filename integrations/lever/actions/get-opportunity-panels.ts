import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    opportunityId: z.string().describe('Opportunity ID. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const InterviewerSchema = z.object({
    id: z.string().nullish(),
    email: z.string().nullish(),
    name: z.string().nullish(),
    feedbackTemplate: z.string().nullish()
});

const InterviewSchema = z.object({
    id: z.string().nullish(),
    date: z.number().nullish(),
    duration: z.number().nullish(),
    feedbackReminder: z.string().nullish(),
    feedbackTemplate: z.string().nullish(),
    interviewers: z.array(InterviewerSchema).nullish(),
    location: z.string().nullish(),
    note: z.string().nullish(),
    subject: z.string().nullish()
});

const PanelSchema = z.object({
    id: z.string(),
    applications: z.array(z.string()).nullish(),
    canceledAt: z.number().nullish(),
    createdAt: z.number().nullish(),
    end: z.number().nullish(),
    externallyManaged: z.boolean().nullish(),
    externalUrl: z.string().nullish(),
    feedbackReminder: z.string().nullish(),
    interviews: z.array(InterviewSchema).nullish(),
    note: z.string().nullish(),
    stage: z.string().nullish(),
    start: z.number().nullish(),
    timezone: z.string().nullish(),
    user: z.string().nullish()
});

const OutputSchema = z.object({
    panels: z.array(PanelSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List interview scheduling panels for an opportunity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['panels:read:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://hire.lever.co/developer/documentation#list-all-panels
            endpoint: `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/panels`,
            params: {
                ...(input.cursor && { offset: input.cursor })
            },
            retries: 3
        });

        const listSchema = z.object({
            data: z.array(z.unknown()),
            hasNext: z.boolean().optional(),
            next: z.string().optional()
        });

        const listData = listSchema.parse(response.data);

        const panels = listData.data.map((item) => {
            const panel = PanelSchema.parse(item);
            return {
                id: panel.id,
                ...(panel.applications != null && { applications: panel.applications }),
                ...(panel.canceledAt != null && { canceledAt: panel.canceledAt }),
                ...(panel.createdAt != null && { createdAt: panel.createdAt }),
                ...(panel.end != null && { end: panel.end }),
                ...(panel.externallyManaged != null && { externallyManaged: panel.externallyManaged }),
                ...(panel.externalUrl != null && { externalUrl: panel.externalUrl }),
                ...(panel.feedbackReminder != null && { feedbackReminder: panel.feedbackReminder }),
                ...(panel.interviews != null && {
                    interviews: panel.interviews.map((interview) => ({
                        ...(interview.id != null && { id: interview.id }),
                        ...(interview.date != null && { date: interview.date }),
                        ...(interview.duration != null && { duration: interview.duration }),
                        ...(interview.feedbackReminder != null && { feedbackReminder: interview.feedbackReminder }),
                        ...(interview.feedbackTemplate != null && { feedbackTemplate: interview.feedbackTemplate }),
                        ...(interview.interviewers != null && {
                            interviewers: interview.interviewers.map((interviewer) => ({
                                ...(interviewer.id != null && { id: interviewer.id }),
                                ...(interviewer.email != null && { email: interviewer.email }),
                                ...(interviewer.name != null && { name: interviewer.name }),
                                ...(interviewer.feedbackTemplate != null && { feedbackTemplate: interviewer.feedbackTemplate })
                            }))
                        }),
                        ...(interview.location != null && { location: interview.location }),
                        ...(interview.note != null && { note: interview.note }),
                        ...(interview.subject != null && { subject: interview.subject })
                    }))
                }),
                ...(panel.note != null && { note: panel.note }),
                ...(panel.stage != null && { stage: panel.stage }),
                ...(panel.start != null && { start: panel.start }),
                ...(panel.timezone != null && { timezone: panel.timezone }),
                ...(panel.user != null && { user: panel.user })
            };
        });

        return {
            panels,
            ...(listData.next != null && { nextCursor: listData.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
