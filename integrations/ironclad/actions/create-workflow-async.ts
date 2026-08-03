import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    template: z.string().describe('Workflow template ID. Example: "68dc41e5a7987b1e623e4711"'),
    attributes: z.record(z.string(), z.unknown()).describe('Workflow attributes. Must include counterpartyName at minimum.'),
    creator: z
        .object({
            type: z.string().optional(),
            email: z.string().optional(),
            id: z.string().optional()
        })
        .optional()
        .describe('Creator specification. Ignored when using OAuth tokens.'),
    useDefaultValues: z.boolean().optional().describe('Use default values for unspecified fields.')
});

const WorkflowRoleAssigneeSchema = z.object({
    userName: z.string().optional(),
    userId: z.string().optional(),
    email: z.string().optional()
});

const WorkflowRoleSchema = z.object({
    id: z.string(),
    displayName: z.string(),
    assignees: z.array(WorkflowRoleAssigneeSchema).optional()
});

const WorkflowCreatorSchema = z
    .object({
        id: z.string().optional(),
        email: z.string().optional(),
        displayName: z.string().optional()
    })
    .passthrough();

const WorkflowSchema = z
    .object({
        id: z.string(),
        ironcladId: z.string().optional(),
        title: z.string(),
        template: z.string(),
        step: z.string(),
        attributes: z.record(z.string(), z.unknown()),
        schema: z.record(z.string(), z.unknown()),
        isCancelled: z.boolean(),
        isComplete: z.boolean(),
        status: z.string(),
        creator: WorkflowCreatorSchema.optional(),
        created: z.string(),
        lastUpdated: z.string(),
        roles: z.array(WorkflowRoleSchema).optional(),
        approvals: z
            .object({
                state: z.string().optional()
            })
            .passthrough()
            .optional(),
        signatures: z
            .object({
                state: z.string().optional(),
                url: z.string().optional()
            })
            .passthrough()
            .optional(),
        recordIds: z.array(z.string()).optional(),
        isRevertibleToReview: z.boolean().optional()
    })
    .passthrough();

const AsyncLaunchResponseSchema = z.object({
    asyncJobId: z.string(),
    asyncJobStatusUrl: z.string()
});

const AsyncStatusResponseSchema = z.object({
    status: z.string(),
    workflow: WorkflowSchema.optional(),
    error: z
        .object({
            code: z.string().optional(),
            message: z.string().optional(),
            param: z.string().optional(),
            redirectUrl: z.string().optional()
        })
        .passthrough()
        .optional()
});

const action = createAction({
    description: 'Launch a new contract workflow asynchronously and poll until completion.',
    version: '1.0.0',
    input: InputSchema,
    output: WorkflowSchema,
    scopes: ['public.workflows.createWorkflows'],

    exec: async (nango, input): Promise<z.infer<typeof WorkflowSchema>> => {
        const launchResponse = await nango.post({
            // https://developer.ironcladapp.com/reference/create-a-new-workflow-async
            endpoint: '/public/api/v1/workflows/async',
            params: {
                ...(input.useDefaultValues !== undefined && {
                    useDefaultValues: String(input.useDefaultValues)
                })
            },
            data: {
                template: input.template,
                attributes: input.attributes,
                ...(input.creator !== undefined && { creator: input.creator })
            },
            retries: 10
        });

        const launchData = AsyncLaunchResponseSchema.parse(launchResponse.data);
        const jobId = launchData.asyncJobId;
        const maxAttempts = 15;
        const delayMs = 2000;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (attempt > 0) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }

            const statusResponse = await nango.get({
                // https://developer.ironcladapp.com/reference/retrieve-asynchronous-workflow-status
                endpoint: `/public/api/v1/workflows/async/${encodeURIComponent(jobId)}`,
                params: {
                    _pollAttempt: String(attempt)
                },
                retries: 3
            });

            const statusData = AsyncStatusResponseSchema.parse(statusResponse.data);

            if (statusData.status === 'success') {
                if (!statusData.workflow) {
                    throw new nango.ActionError({
                        type: 'missing_workflow',
                        message: 'Async workflow launch succeeded but workflow data is missing.'
                    });
                }
                return statusData.workflow;
            }

            if (statusData.status === 'failed') {
                throw new nango.ActionError({
                    type: 'launch_failed',
                    message: statusData.error?.message || 'Async workflow launch failed.',
                    code: statusData.error?.code,
                    param: statusData.error?.param
                });
            }
        }

        throw new nango.ActionError({
            type: 'polling_timeout',
            message: `Async workflow launch polling timed out after ${maxAttempts} attempts.`,
            asyncJobId: jobId
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
