import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    applicationId: z.string().describe('The id of the application to fetch. Example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"')
});

const ContactInfoSchema = z.object({
    value: z.string(),
    type: z.string(),
    isPrimary: z.boolean()
});

const CandidateSchema = z.object({
    id: z.string(),
    name: z.string(),
    primaryEmailAddress: ContactInfoSchema.optional(),
    primaryPhoneNumber: ContactInfoSchema.optional()
});

const InterviewStageSchema = z
    .object({
        id: z.string(),
        title: z.string()
    })
    .passthrough();

const SourceSchema = z
    .object({
        id: z.string(),
        title: z.string()
    })
    .passthrough();

const ArchiveReasonSchema = z.object({}).passthrough();

const JobSchema = z.object({
    id: z.string(),
    title: z.string(),
    locationId: z.string().optional(),
    departmentId: z.string().optional()
});

const UserSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const HiringTeamMemberSchema = z
    .object({
        userId: z.string()
    })
    .passthrough();

const ApplicationSchema = z.object({
    id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    status: z.string(),
    candidate: CandidateSchema,
    currentInterviewStage: InterviewStageSchema,
    job: JobSchema,
    hiringTeam: z.array(HiringTeamMemberSchema),
    source: SourceSchema.optional(),
    archiveReason: ArchiveReasonSchema.nullable().optional(),
    archivedAt: z.string().optional(),
    creditedToUser: UserSchema.nullable().optional(),
    appliedViaJobPostingId: z.string().optional(),
    submitterClientIp: z.string().nullable().optional(),
    submitterUserAgent: z.string().nullable().optional(),
    customFields: z.array(z.object({}).passthrough()).optional(),
    resumeFileHandle: z.object({}).passthrough().optional(),
    openings: z.array(z.object({}).passthrough()).optional(),
    applicationHistory: z.array(z.object({}).passthrough()).optional(),
    applicationFormSubmissions: z.array(z.object({}).passthrough()).optional(),
    referrals: z.array(z.object({}).passthrough()).optional()
});

const OutputSchema = z.object({
    application: ApplicationSchema
});

const action = createAction({
    description: 'Retrieve a single application from Ashby.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['candidatesRead'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.ashbyhq.com/reference/applicationinfo
            endpoint: 'application.info',
            data: {
                applicationId: input.applicationId
            },
            retries: 3
        });

        const ashbyResponse = z
            .object({
                success: z.boolean(),
                results: z.unknown()
            })
            .parse(response.data);

        if (!ashbyResponse.success) {
            const errorResponse = z
                .object({
                    success: z.literal(false),
                    errorInfo: z.object({
                        code: z.string().optional(),
                        message: z.string().optional(),
                        requestId: z.string().optional()
                    })
                })
                .parse(response.data);

            throw new nango.ActionError({
                type: errorResponse.errorInfo.code ?? 'unknown_error',
                message: errorResponse.errorInfo.message ?? 'An unknown error occurred'
            });
        }

        const application = ApplicationSchema.parse(ashbyResponse.results);

        return {
            application
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
