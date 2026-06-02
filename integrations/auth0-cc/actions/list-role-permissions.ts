import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    role_id: z.string().describe('The ID of the role to list permissions for. Example: "rol_abc123"')
});

const PermissionSchema = z.object({
    resource_server_identifier: z.string(),
    permission_name: z.string(),
    resource_server_name: z.string(),
    description: z.string().optional()
});

const OutputSchema = z.object({
    permissions: z.array(PermissionSchema)
});

const action = createAction({
    description: 'List the permissions associated with a role in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-role-permissions',
        group: 'Roles'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:roles'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const perPage = 50;

        const fetchPermissions = async (page: number): Promise<z.infer<typeof PermissionSchema>[]> => {
            const config: ProxyConfiguration = {
                // https://auth0.com/docs/api/management/v2/roles/get-role-permission
                endpoint: `/api/v2/roles/${encodeURIComponent(input.role_id)}/permissions`,
                params: {
                    page: String(page),
                    per_page: String(perPage)
                },
                retries: 3
            };

            const response = await nango.get(config);

            const parsed = z.array(PermissionSchema).safeParse(response.data);

            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'The provider returned an unexpected response format.',
                    details: parsed.error.issues
                });
            }

            const pagePermissions = parsed.data;

            if (pagePermissions.length < perPage) {
                return pagePermissions;
            }

            const nextPagePermissions = await fetchPermissions(page + 1);

            return pagePermissions.concat(nextPagePermissions);
        };

        const permissions = await fetchPermissions(0);

        return { permissions };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
