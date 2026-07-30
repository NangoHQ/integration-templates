import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workflowId: z.string().describe('Workflow ID. Example: "6a6b328004308879e7d439b6"'),
    roleId: z.string().describe('Approval role ID. Example: "approver137e74661e0b40e38e3a52dff067cd0c"'),
    status: z.enum(['approved', 'rejected']).describe('Approval status to set.')
});

const ProviderResponseSchema = z.union([
    z.boolean(),
    z
        .object({
            id: z.string().optional(),
            role: z.string().optional(),
            status: z.string().optional()
        })
        .passthrough()
]);

const OutputSchema = z.object({
    workflowId: z.string(),
    roleId: z.string(),
    status: z.enum(['approved', 'rejected'])
});

const action = createAction({
    description: 'Approve or reject a pending approval role on a workflow.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://developer.ironcladapp.com/
            endpoint: `/public/api/v1/workflows/${encodeURIComponent(input.workflowId)}/approvals/${encodeURIComponent(input.roleId)}`,
            data: {
                status: input.status
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const resolvedStatus = typeof providerResponse === 'boolean' ? input.status : providerResponse.status === 'rejected' ? 'rejected' : 'approved';

        return {
            workflowId: input.workflowId,
            roleId: input.roleId,
            status: resolvedStatus
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
