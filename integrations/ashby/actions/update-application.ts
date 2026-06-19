import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    applicationId: z.string().describe('The id of the application to update. Example: "3ae2b801-19f6-41ef-ad28-214bd731948f"'),
    sourceId: z.string().optional().describe('The source to set on the application.'),
    creditedToUserId: z.string().optional().describe('The id of the user the application will be credited to.'),
    createdAt: z.string().optional().describe("An ISO date string to set the application's createdAt timestamp."),
    sendNotifications: z.boolean().optional().describe('Whether users subscribed to the application should be notified. Default is true.')
});

const CandidateSchema = z.object({
    id: z.string(),
    name: z.string()
});

const JobSchema = z.object({
    id: z.string(),
    title: z.string()
});

const InterviewStageSchema = z.object({
    id: z.string(),
    title: z.string().optional()
});

const ApplicationSchema = z.object({
    id: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    status: z.string().optional(),
    candidate: CandidateSchema.optional(),
    currentInterviewStage: InterviewStageSchema.optional(),
    job: JobSchema.optional()
});

const ProviderResponseSchema = z.object({
    success: z.boolean().optional(),
    results: ApplicationSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    status: z.string().optional(),
    candidate: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional(),
    currentInterviewStage: z
        .object({
            id: z.string(),
            title: z.string().optional()
        })
        .optional(),
    job: z
        .object({
            id: z.string(),
            title: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Update an application in Ashby.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['candidatesWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            applicationId: input.applicationId
        };

        if (input.sourceId !== undefined) {
            data['sourceId'] = input.sourceId;
        }
        if (input.creditedToUserId !== undefined) {
            data['creditedToUserId'] = input.creditedToUserId;
        }
        if (input.createdAt !== undefined) {
            data['createdAt'] = input.createdAt;
        }
        if (input.sendNotifications !== undefined) {
            data['sendNotifications'] = input.sendNotifications;
        }

        const response = await nango.post({
            // https://developers.ashbyhq.com/reference/applicationupdate
            endpoint: 'application.update',
            data,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.success === false || !parsed.results) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Failed to update application',
                applicationId: input.applicationId
            });
        }

        const app = parsed.results;

        return {
            id: app.id,
            ...(app.createdAt !== undefined && { createdAt: app.createdAt }),
            ...(app.updatedAt !== undefined && { updatedAt: app.updatedAt }),
            ...(app.status !== undefined && { status: app.status }),
            ...(app.candidate !== undefined && {
                candidate: {
                    id: app.candidate.id,
                    ...(app.candidate.name !== undefined && { name: app.candidate.name })
                }
            }),
            ...(app.currentInterviewStage !== undefined && {
                currentInterviewStage: {
                    id: app.currentInterviewStage.id,
                    ...(app.currentInterviewStage.title !== undefined && { title: app.currentInterviewStage.title })
                }
            }),
            ...(app.job !== undefined && {
                job: {
                    id: app.job.id,
                    ...(app.job.title !== undefined && { title: app.job.title })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
