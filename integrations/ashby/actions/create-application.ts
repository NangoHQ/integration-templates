import { z } from 'zod';
import { createAction } from 'nango';

const ApplicationHistoryItemSchema = z.object({
    stageId: z.string(),
    stageNumber: z.number(),
    enteredStageAt: z.string(),
    archiveReasonId: z.string().optional()
});

const InputSchema = z.object({
    candidateId: z.string().describe('The id of the candidate to consider for a job. Example: "3ae2b801-19f6-41ef-ad28-214bd731948f"'),
    jobId: z.string().describe('The id of the job to consider the candidate for. Example: "2c6991c5-c9e2-4af8-879e-29c5a9d26509"'),
    interviewPlanId: z.string().optional().describe('The id of the interview plan to place the application in.'),
    interviewStageId: z.string().optional().describe('The interview stage to place the application in.'),
    sourceId: z.string().optional().describe('The source to set on the application being created.'),
    creditedToUserId: z.string().optional().describe('The id of the user the application will be credited to.'),
    createdAt: z.string().optional().describe('An ISO date string to set the application createdAt timestamp.'),
    applicationHistory: z.array(ApplicationHistoryItemSchema).optional().describe('An array of objects representing the application history.')
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    results: z.unknown(),
    errorInfo: z
        .object({
            code: z.string(),
            message: z.string().optional(),
            requestId: z.string().optional()
        })
        .optional(),
    warnings: z.array(z.string()).optional()
});

const ProviderCandidateSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        primaryEmailAddress: z
            .object({
                value: z.string(),
                type: z.string().optional(),
                isPrimary: z.boolean().optional()
            })
            .optional(),
        primaryPhoneNumber: z
            .object({
                value: z.string(),
                type: z.string().optional(),
                isPrimary: z.boolean().optional()
            })
            .optional()
    })
    .passthrough();

const ProviderJobSchema = z
    .object({
        id: z.string(),
        title: z.string().optional(),
        locationId: z.string().optional(),
        departmentId: z.string().optional()
    })
    .passthrough();

const ProviderStageSchema = z
    .object({
        id: z.string(),
        name: z.string().optional()
    })
    .passthrough();

const ProviderSourceSchema = z
    .object({
        id: z.string(),
        name: z.string().optional()
    })
    .passthrough();

const ProviderUserSchema = z
    .object({
        id: z.string(),
        name: z.string().optional()
    })
    .passthrough();

const ProviderArchiveReasonSchema = z
    .object({
        id: z.string(),
        name: z.string().optional()
    })
    .passthrough();

const ProviderApplicationSchema = z.object({
    id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    status: z.string(),
    candidate: ProviderCandidateSchema,
    currentInterviewStage: ProviderStageSchema,
    job: ProviderJobSchema,
    hiringTeam: z.array(z.unknown()),
    source: ProviderSourceSchema.nullish(),
    archiveReason: ProviderArchiveReasonSchema.nullish(),
    archivedAt: z.string().nullish(),
    creditedToUser: ProviderUserSchema.nullish(),
    appliedViaJobPostingId: z.string().nullish(),
    customFields: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    status: z.string(),
    candidate: z.object({
        id: z.string(),
        name: z.string().optional()
    }),
    job: z.object({
        id: z.string(),
        title: z.string().optional()
    }),
    currentInterviewStage: z.object({
        id: z.string(),
        name: z.string().optional()
    }),
    source: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional(),
    archiveReason: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional(),
    archivedAt: z.string().optional(),
    creditedToUser: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional(),
    appliedViaJobPostingId: z.string().optional(),
    customFields: z.array(z.unknown()).optional(),
    hiringTeam: z.array(z.unknown())
});

const action = createAction({
    description: 'Create an application in Ashby.',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['candidatesWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.ashbyhq.com/reference/applicationcreate
            endpoint: 'application.create',
            data: {
                candidateId: input.candidateId,
                jobId: input.jobId,
                ...(input.interviewPlanId !== undefined && { interviewPlanId: input.interviewPlanId }),
                ...(input.interviewStageId !== undefined && { interviewStageId: input.interviewStageId }),
                ...(input.sourceId !== undefined && { sourceId: input.sourceId }),
                ...(input.creditedToUserId !== undefined && { creditedToUserId: input.creditedToUserId }),
                ...(input.createdAt !== undefined && { createdAt: input.createdAt }),
                ...(input.applicationHistory !== undefined && { applicationHistory: input.applicationHistory })
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.errorInfo?.message || 'Application creation failed',
                code: providerResponse.errorInfo?.code,
                requestId: providerResponse.errorInfo?.requestId
            });
        }

        const providerApplication = ProviderApplicationSchema.parse(providerResponse.results);

        return {
            id: providerApplication.id,
            createdAt: providerApplication.createdAt,
            updatedAt: providerApplication.updatedAt,
            status: providerApplication.status,
            candidate: {
                id: providerApplication.candidate.id,
                ...(providerApplication.candidate.name !== undefined && {
                    name: providerApplication.candidate.name
                })
            },
            job: {
                id: providerApplication.job.id,
                ...(providerApplication.job.title !== undefined && {
                    title: providerApplication.job.title
                })
            },
            currentInterviewStage: {
                id: providerApplication.currentInterviewStage.id,
                ...(providerApplication.currentInterviewStage.name !== undefined && {
                    name: providerApplication.currentInterviewStage.name
                })
            },
            ...(providerApplication.source != null && {
                source: {
                    id: providerApplication.source.id,
                    ...(providerApplication.source.name !== undefined && {
                        name: providerApplication.source.name
                    })
                }
            }),
            ...(providerApplication.archiveReason != null && {
                archiveReason: {
                    id: providerApplication.archiveReason.id,
                    ...(providerApplication.archiveReason.name !== undefined && {
                        name: providerApplication.archiveReason.name
                    })
                }
            }),
            ...(providerApplication.archivedAt != null && { archivedAt: providerApplication.archivedAt }),
            ...(providerApplication.creditedToUser != null && {
                creditedToUser: {
                    id: providerApplication.creditedToUser.id,
                    ...(providerApplication.creditedToUser.name !== undefined && {
                        name: providerApplication.creditedToUser.name
                    })
                }
            }),
            ...(providerApplication.appliedViaJobPostingId != null && {
                appliedViaJobPostingId: providerApplication.appliedViaJobPostingId
            }),
            ...(providerApplication.customFields !== undefined && {
                customFields: providerApplication.customFields
            }),
            hiringTeam: providerApplication.hiringTeam
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
