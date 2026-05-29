import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RoleSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional()
});

const PermissionSchema = z.object({
    resource_server_identifier: z.string(),
    permission_name: z.string(),
    resource_server_name: z.string().optional(),
    description: z.string().optional()
});

const RolePermissionSchema = z.object({
    id: z.string(),
    role_id: z.string(),
    permission_name: z.string(),
    resource_server_identifier: z.string(),
    resource_server_name: z.string().optional(),
    description: z.string().optional()
});

const sync = createSync({
    description: 'Sync permissions associated with each role from Auth0.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/role-permissions'
        }
    ],
    models: {
        RolePermission: RolePermissionSchema
    },

    exec: async (nango) => {
        // Blocker: Auth0 Management API GET /api/v2/roles and GET /api/v2/roles/{id}/permissions
        // do not support timestamp-based filtering, cursors, or change-detection parameters.
        // They only provide offset pagination, so a full refresh is required.
        await nango.trackDeletesStart('RolePermission');

        const rolesProxyConfig: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/roles/get-roles
            endpoint: '/api/v2/roles',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 50
            },
            retries: 3
        };

        for await (const rolesBatch of nango.paginate(rolesProxyConfig)) {
            const rolesResult = z.array(RoleSchema).safeParse(rolesBatch);
            if (!rolesResult.success) {
                throw new Error(`Failed to parse roles batch: ${rolesResult.error.message}`);
            }

            for (const role of rolesResult.data) {
                const permissionsProxyConfig: ProxyConfiguration = {
                    // https://auth0.com/docs/api/management/v2/roles/get-role-permission
                    endpoint: `/api/v2/roles/${encodeURIComponent(role.id)}/permissions`,
                    paginate: {
                        type: 'offset',
                        offset_name_in_request: 'page',
                        offset_start_value: 0,
                        offset_calculation_method: 'per-page',
                        limit_name_in_request: 'per_page',
                        limit: 50
                    },
                    retries: 3
                };

                for await (const permissionsBatch of nango.paginate(permissionsProxyConfig)) {
                    const permissionsResult = z.array(PermissionSchema).safeParse(permissionsBatch);
                    if (!permissionsResult.success) {
                        throw new Error(`Failed to parse permissions batch for role ${role.id}: ${permissionsResult.error.message}`);
                    }

                    const records = permissionsResult.data.map((permission) => ({
                        id: `${role.id}:${permission.resource_server_identifier}:${permission.permission_name}`,
                        role_id: role.id,
                        permission_name: permission.permission_name,
                        resource_server_identifier: permission.resource_server_identifier,
                        ...(permission.resource_server_name !== undefined && { resource_server_name: permission.resource_server_name }),
                        ...(permission.description !== undefined && { description: permission.description })
                    }));

                    if (records.length > 0) {
                        await nango.batchSave(records, 'RolePermission');
                    }
                }
            }
        }

        await nango.trackDeletesEnd('RolePermission');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
