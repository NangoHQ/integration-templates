import { z } from 'zod';
import { createAction } from 'nango';

const ArchiveEmailSchema = z.object({
    communicationTemplateId: z.string().describe('The id of the communication template to use for the email.'),
    sendAt: z
        .string()
        .optional()
        .describe('ISO 8601 date-time to send the email. If omitted, scheduled for the following morning at 9:32am in the default timezone.')
});

const InputSchema = z.object({
    applicationId: z.string().describe('The id of the application to update the stage of. Example: "3ae2b801-19f6-41ef-ad28-214bd731948f"'),
    interviewStageId: z.string().describe('The interview stage to move the application to. Example: "2c6991c5-c9e2-4af8-879e-29c5a9d26509"'),
    archiveReasonId: z
        .string()
        .optional()
        .describe('Archive reason to set when moving to an Interview Stage with type: Archived. Required when moving to an Archived stage.'),
    archiveEmail: ArchiveEmailSchema.optional().describe('Email to send to the candidate when moving to an Interview Stage with type: Archived.')
});

const PrimaryContactInfoSchema = z.object({
    value: z.string(),
    type: z.string(),
    isPrimary: z.boolean()
});

const CandidateSchema = z.object({
    id: z.string(),
    name: z.string(),
    primaryEmailAddress: PrimaryContactInfoSchema.optional(),
    primaryPhoneNumber: PrimaryContactInfoSchema.optional()
});

const InterviewStageSchema = z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    interviewPlanId: z.string().optional(),
    orderInInterviewPlan: z.number().optional(),
    interviewStageGroupId: z.string().nullable().optional()
});

const SourceSchema = z.object({
    id: z.string(),
    title: z.string(),
    isArchived: z.boolean().optional(),
    sourceType: z
        .object({
            id: z.string(),
            title: z.string(),
            isArchived: z.boolean().optional()
        })
        .optional()
});

const ArchiveReasonSchema = z.object({
    id: z.string(),
    text: z.string(),
    reasonType: z.string().optional(),
    isArchived: z.boolean().optional(),
    customFields: z.array(z.object({}).passthrough()).optional()
});

const JobSchema = z.object({
    id: z.string(),
    title: z.string(),
    locationId: z.string().optional(),
    departmentId: z.string().optional(),
    brandId: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    status: z.string(),
    candidate: CandidateSchema,
    customFields: z.array(z.object({}).passthrough()).optional(),
    currentInterviewStage: InterviewStageSchema,
    source: SourceSchema.optional(),
    creditedToUser: z.unknown().nullable().optional(),
    archiveReason: ArchiveReasonSchema.nullable().optional(),
    job: JobSchema,
    hiringTeam: z.array(z.object({}).passthrough()).optional(),
    appliedViaJobPostingId: z.string().nullable().optional(),
    submitterClientIp: z.string().nullable().optional(),
    submitterUserAgent: z.string().nullable().optional()
});

const ChangeStageResponseSchema = z.object({
    success: z.boolean(),
    results: OutputSchema
});

const action = createAction({
    description: 'Move an application to another interview stage.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/change-application-stage',
        group: 'Applications'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['candidatesWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            applicationId: input.applicationId,
            interviewStageId: input.interviewStageId
        };

        if (input.archiveReasonId !== undefined) {
            payload['archiveReasonId'] = input.archiveReasonId;
        }

        if (input.archiveEmail !== undefined) {
            payload['archiveEmail'] = input.archiveEmail;
        }

        const response = await nango.post({
            // https://developers.ashbyhq.com/reference/applicationchangestage
            endpoint: '/application.changeStage',
            data: payload,
            retries: 1
        });

        const parsed = ChangeStageResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response format',
                details: parsed.error.issues
            });
        }

        if (!parsed.data.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Provider returned a failure response'
            });
        }

        return parsed.data.results;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
