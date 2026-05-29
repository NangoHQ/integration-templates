import { z } from 'zod';
import { createAction } from 'nango';

const PermissionSchema = z.object({
    resource_server_identifier: z.string().describe('Resource server (API) identifier that this permission is for. Example: "https://api.example.com"'),
    permission_name: z.string().describe('Name of this permission. Example: "read:users"')
});

const InputSchema = z.object({
    role_id: z.string().describe('ID of the role to add permissions to. Example: "rol_1234567890abcdef"'),
    permissions: z.array(PermissionSchema).min(1).describe('Array of permission objects to assign to the role.')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the permissions were successfully assigned to the role.')
});

const action = createAction({
    description: 'Assign permissions to a role in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/assign-permissions-to-role',
        group: 'Roles'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['update:roles'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://auth0.com/docs/api/management/v2/roles/post-role-permission-assignment
        await nango.post({
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
