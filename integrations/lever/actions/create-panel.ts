import { z } from 'zod';
import { createAction } from 'nango';

const InterviewerInputSchema = z.object({
    id: z.string().describe('User ID of the interviewer. Example: "c4bc6266-375b-4d45-9b3b-ad527ba5f3ef"')
});

const InterviewInputSchema = z.object({
    subject: z.string().optional().describe('Subject or title of the interview.'),
    note: z.string().optional().describe('Additional notes for the interview.'),
    interviewers: z.array(InterviewerInputSchema).min(1).describe('At least one interviewer is required.'),
    date: z.number().describe('Start time as a Unix timestamp in milliseconds. Example: 1751404800000'),
    duration: z.number().optional().describe('Duration in minutes.')
});

const InputSchema = z.object({
    opportunityId: z.string().describe('Opportunity ID to schedule interviews for. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    performAs: z.string().describe('Lever user ID to attribute this action to. Example: "be129d9b-50da-4485-9377-0d83e981f30b"'),
    timezone: z.string().optional().describe('Timezone for the interviews. Example: "America/Los_Angeles"'),
    interviews: z.array(InterviewInputSchema).min(1).describe('At least one interview is required.')
});

const ProviderInterviewerSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    name: z.string().optional()
});

const ProviderInterviewSchema = z.object({
    id: z.string(),
    subject: z.string().optional(),
    note: z.string().optional(),
    interviewers: z.array(ProviderInterviewerSchema).optional(),
    date: z.number().optional(),
    duration: z.number().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional()
});

const ProviderPanelSchema = z.object({
    id: z.string(),
    opportunityId: z.string().optional(),
    timezone: z.string().optional(),
    interviews: z.array(ProviderInterviewSchema).optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    opportunityId: z.string().optional(),
    timezone: z.string().optional(),
    interviews: z
        .array(
            z.object({
                id: z.string(),
                subject: z.string().optional(),
                note: z.string().optional(),
                interviewers: z.array(ProviderInterviewerSchema).optional(),
                date: z.number().optional(),
                duration: z.number().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Schedule one or more interviews for an opportunity by creating an interview panel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['opportunities:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://hire.lever.co/developer/documentation
            endpoint: `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/panels`,
            params: {
                perform_as: input.performAs
            },
            data: {
                ...(input.timezone !== undefined && { timezone: input.timezone }),
                interviews: input.interviews.map((interview) => ({
                    ...(interview.subject !== undefined && { subject: interview.subject }),
                    ...(interview.note !== undefined && { note: interview.note }),
                    interviewers: interview.interviewers.map((interviewer) => ({ id: interviewer.id })),
                    date: interview.date,
                    ...(interview.duration !== undefined && { duration: interview.duration })
                }))
            },
            retries: 10
        });

        const wrapper = z.object({ data: ProviderPanelSchema }).parse(response.data);
        const providerPanel = wrapper.data;

        return {
            id: providerPanel.id,
            ...(providerPanel.opportunityId !== undefined && { opportunityId: providerPanel.opportunityId }),
            ...(providerPanel.timezone !== undefined && { timezone: providerPanel.timezone }),
            ...(providerPanel.interviews !== undefined && {
                interviews: providerPanel.interviews.map((interview) => ({
                    id: interview.id,
                    ...(interview.subject !== undefined && { subject: interview.subject }),
                    ...(interview.note !== undefined && { note: interview.note }),
                    ...(interview.interviewers !== undefined && { interviewers: interview.interviewers }),
                    ...(interview.date !== undefined && { date: interview.date }),
                    ...(interview.duration !== undefined && { duration: interview.duration })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
