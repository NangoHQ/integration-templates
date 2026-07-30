import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    jobId: z.string().describe('The async job ID returned by create-workflow-async. Example: "abc123"')
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

const OutputSchema = z
    .object({
        asyncJobId: z.string().optional(),
        status: z.string(),
        asyncJobStatusUrl: z.string().optional(),
        workflow: WorkflowSchema.optional()
    })
    .passthrough();

const action = createAction({
    description: 'Check the status of an asynchronous workflow-creation job and retrieve the created workflow once done.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.createWorkflows'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.ironcladapp.com/
            endpoint: `/public/api/v1/workflows/async/${encodeURIComponent(input.jobId)}`,
            retries: 3
        });

        const providerJob = OutputSchema.parse(response.data);

        return providerJob;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
