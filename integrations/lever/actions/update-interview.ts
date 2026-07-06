import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InterviewerInputSchema = z.object({
    id: z.string().describe('User ID of the interviewer. Example: "c4bc6266-375b-4d45-9b3b-ad527ba5f3ef"')
});

const InputSchema = z.object({
    opportunityId: z.string().describe('The ID of the opportunity containing the interview. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    interviewId: z.string().describe('The ID of the interview to update. Example: "32b7bf78-4592-4a56-b313-3e31ed25ea00"'),
    perform_as: z.string().describe('Lever user ID to attribute this change to. Example: "c4bc6266-375b-4d45-9b3b-ad527ba5f3ef"'),
    subject: z.string().optional().describe('Updated subject/title of the interview.'),
    note: z.string().optional().describe('Updated note for the interview.'),
    interviewers: z.array(InterviewerInputSchema).optional().describe('Updated list of interviewers. Must be objects with an id field.'),
    date: z.number().optional().describe('Updated interview start time as epoch milliseconds.'),
    duration: z.number().optional().describe('Updated duration in minutes.')
});

const ProviderInterviewerSchema = z.object({
    id: z.string().optional(),
    email: z.string().optional()
});

const CurrentInterviewSchema = z
    .object({
        subject: z.string().nullish(),
        note: z.string().nullish(),
        interviewers: z.array(z.object({ id: z.string().optional() }).passthrough()).nullish(),
        date: z.number().nullish(),
        duration: z.number().nullish()
    })
    .passthrough();

const ProviderInterviewSchema = z.object({
    id: z.string(),
    subject: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    interviewers: z.array(ProviderInterviewerSchema).optional().nullable(),
    date: z.number().optional().nullable(),
    duration: z.number().optional().nullable(),
    timezone: z.string().optional().nullable(),
    stage: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    subject: z.string().optional(),
    note: z.string().optional(),
    interviewers: z
        .array(
            z.object({
                id: z.string().optional(),
                email: z.string().optional()
            })
        )
        .optional(),
    date: z.number().optional(),
    duration: z.number().optional(),
    timezone: z.string().optional(),
    stage: z.string().optional()
});

const action = createAction({
    description: "Update an existing interview's subject, note, interviewers, date, or duration.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {};

        const isPartialUpdate =
            input.subject === undefined ||
            input.note === undefined ||
            input.interviewers === undefined ||
            input.date === undefined ||
            input.duration === undefined;

        // Lever's update-interview endpoint replaces the full interview body, so on a partial
        // update, fields the caller did not specify must be re-sent with their current values
        // or they get cleared.
        let currentInterview: z.infer<typeof CurrentInterviewSchema> | undefined;
        if (isPartialUpdate) {
            const getConfig: ProxyConfiguration = {
                // https://hire.lever.co/developer/documentation#retrieve-a-single-interview
                endpoint: `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/interviews/${encodeURIComponent(input.interviewId)}`,
                retries: 3
            };
            const currentResponse = await nango.get(getConfig);

            if (!currentResponse.data) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Interview not found.',
                    opportunityId: input.opportunityId,
                    interviewId: input.interviewId
                });
            }

            const currentWrapper = z.object({ data: z.unknown() }).safeParse(currentResponse.data);
            const rawCurrentInterview = currentWrapper.success ? currentWrapper.data.data : currentResponse.data;
            currentInterview = CurrentInterviewSchema.parse(rawCurrentInterview);
        }

        requestBody['subject'] = input.subject !== undefined ? input.subject : currentInterview?.subject;
        requestBody['note'] = input.note !== undefined ? input.note : currentInterview?.note;
        requestBody['interviewers'] =
            input.interviewers !== undefined
                ? input.interviewers
                : (currentInterview?.interviewers ?? []).filter((i): i is { id: string } => i.id !== undefined).map((i) => ({ id: i.id }));
        requestBody['date'] = input.date !== undefined ? input.date : currentInterview?.date;
        requestBody['duration'] = input.duration !== undefined ? input.duration : currentInterview?.duration;

        // https://hire.lever.co/developer/documentation#update-an-interview
        const response = await nango.put({
            endpoint: `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/interviews/${encodeURIComponent(input.interviewId)}`,
            params: {
                perform_as: input.perform_as
            },
            data: requestBody,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Interview not found or update failed.',
                opportunityId: input.opportunityId,
                interviewId: input.interviewId
            });
        }

        const wrapper = z.object({ data: z.unknown() }).safeParse(response.data);
        const rawInterview = wrapper.success ? wrapper.data.data : response.data;
        const interview = ProviderInterviewSchema.parse(rawInterview);

        return {
            id: interview.id,
            ...(interview.subject != null && { subject: interview.subject }),
            ...(interview.note != null && { note: interview.note }),
            ...(interview.interviewers != null && {
                interviewers: interview.interviewers
                    .filter((i) => i !== null && i !== undefined)
                    .map((i) => ({
                        ...(i.id != null && { id: i.id }),
                        ...(i.email != null && { email: i.email })
                    }))
            }),
            ...(interview.date != null && { date: interview.date }),
            ...(interview.duration != null && { duration: interview.duration }),
            ...(interview.timezone != null && { timezone: interview.timezone }),
            ...(interview.stage != null && { stage: interview.stage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
