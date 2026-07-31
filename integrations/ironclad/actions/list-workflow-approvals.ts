import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workflowId: z.string().describe('The unique identifier or Ironclad ID of the workflow. Example: "5f595f76c4fc9b3571413c3ac"')
});

const ReviewerSchema = z.object({
    role: z.string().optional(),
    displayName: z.string().optional(),
    reviewerType: z.string().optional(),
    status: z.enum(['pending', 'approved']).optional()
});

const ApprovalGroupSchema = z.object({
    reviewers: z.array(ReviewerSchema).optional(),
    status: z.enum(['pending', 'approved', 'active']).optional(),
    order: z.number().optional()
});

const RoleAssigneeSchema = z.object({
    userName: z.string().optional(),
    userId: z.string().optional(),
    email: z.string().optional()
});

const RoleSchema = z.object({
    id: z.string().optional(),
    displayName: z.string().optional(),
    assignees: z.array(RoleAssigneeSchema).optional()
});

const OutputSchema = z.object({
    workflowId: z.string().optional(),
    title: z.string().optional(),
    approvalGroups: z.array(ApprovalGroupSchema).optional(),
    roles: z.array(RoleSchema).optional()
});

const action = createAction({
    description: 'Get the approval-group/role structure and current approval state for a workflow.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.readApprovals'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.ironcladapp.com/reference/list-all-workflow-approvals
            endpoint: `/public/api/v1/workflows/${encodeURIComponent(input.workflowId)}/approvals`,
            retries: 3
        });

        const data = z
            .object({
                workflowId: z.string().optional(),
                title: z.string().optional(),
                approvalGroups: z.array(z.unknown()).optional(),
                roles: z.array(z.unknown()).optional()
            })
            .parse(response.data);

        return {
            workflowId: data.workflowId,
            title: data.title,
            approvalGroups: data.approvalGroups?.map((group) => ApprovalGroupSchema.parse(group)),
            roles: data.roles?.map((role) => RoleSchema.parse(role))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
