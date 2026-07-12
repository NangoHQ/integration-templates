import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('User ID. Example: "00u14y5oijeYKVDn0698"'),
    roleAssignmentId: z.string().describe('Role assignment ID. Example: "KVJUKUS7IFCE2SKO"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Remove an admin role assignment from a user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.roles.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.okta.com/docs/reference/api/roles/#unassign-role-from-user
        await nango.delete({
            endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}/roles/${encodeURIComponent(input.roleAssignmentId)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
