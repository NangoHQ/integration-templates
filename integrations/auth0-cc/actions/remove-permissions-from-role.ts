import { z } from 'zod';
import { createAction } from 'nango';

const PermissionInputSchema = z.object({
    resource_server_identifier: z.string().describe('Resource server identifier. Example: "https://api.example.com"'),
    permission_name: z.string().describe('Permission name. Example: "read:users"')
});

const InputSchema = z.object({
    role_id: z.string().describe('Role ID. Example: "rol_abc123"'),
    permissions: z.array(PermissionInputSchema).min(1).describe('Permissions to remove from the role')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Remove permissions from a role in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/remove-permissions-from-role',
        group: 'Roles'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['update:roles'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://auth0.com/docs/api/management/v2/roles/delete-role-permissions-assignment
        await nango.delete({
            endpoint: `/api/v2/roles/${encodeURIComponent(input.role_id)}/permissions`,
            data: {
                permissions: input.permissions
            },
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
