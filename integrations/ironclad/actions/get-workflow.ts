import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workflowId: z.string().describe('The unique identifier of the workflow. Example: "6a6b328004308879e7d439b6"')
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

const ProviderWorkflowSchema = z
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

const action = createAction({
    description: 'Get full details of a single workflow, including its current schema and attribute values.',
    version: '1.0.0',
    input: InputSchema,
    output: ProviderWorkflowSchema,
    scopes: ['public.workflows.readWorkflows'],

    exec: async (nango, input): Promise<z.infer<typeof ProviderWorkflowSchema>> => {
        const response = await nango.get({
            // https://developer.ironcladapp.com/reference/get-workflow
            endpoint: `/public/api/v1/workflows/${encodeURIComponent(input.workflowId)}`,
            retries: 3
        });

        const workflow = ProviderWorkflowSchema.parse(response.data);

        return workflow;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
