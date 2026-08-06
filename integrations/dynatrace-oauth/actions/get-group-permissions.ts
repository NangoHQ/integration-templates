import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupUuid: z.string().describe('Group UUID. Example: "0bb8915e-fe63-4e37-a1ba-102e7daa375a"'),
    accountUuid: z.string().optional().describe('Dynatrace account UUID. If omitted, it will be read from the connection config.')
});

const PermissionSchema = z.object({
    permissionName: z.string(),
    scope: z.string(),
    scopeType: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const OutputSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    description: z.string().optional(),
    owner: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    permissions: z.array(PermissionSchema)
});

const ConnectionConfigSchema = z.object({
    accountUuid: z.string()
});

const ProviderResponseSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    owner: z.string().optional().nullable(),
    createdAt: z.string().optional().nullable(),
    updatedAt: z.string().optional().nullable(),
    permissions: z
        .array(
            z.object({
                permissionName: z.string(),
                scope: z.string(),
                scopeType: z.string(),
                createdAt: z.string().optional().nullable(),
                updatedAt: z.string().optional().nullable()
            })
        )
        .optional()
        .nullable()
});

const action = createAction({
    description: 'Get the directly-assigned permissions on a group',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['iam:groups:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let accountUuid = input.accountUuid;

        if (!accountUuid) {
            const connection = await nango.getConnection();

            const connectionConfig = ConnectionConfigSchema.safeParse(connection.connection_config);
            if (!connectionConfig.success) {
                throw new nango.ActionError({
                    type: 'missing_account_uuid',
                    message: 'accountUuid is missing in connection config and was not provided as input.'
                });
            }

            accountUuid = connectionConfig.data.accountUuid;
        }

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/groups-api/get-group-permissions
            endpoint: `iam/v1/accounts/${encodeURIComponent(accountUuid)}/groups/${encodeURIComponent(input.groupUuid)}/permissions`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The API response did not match the expected schema.'
            });
        }

        const data = providerResponse.data;

        return {
            uuid: data.uuid,
            name: data.name,
            ...(data.description != null && { description: data.description }),
            ...(data.owner != null && { owner: data.owner }),
            ...(data.createdAt != null && { createdAt: data.createdAt }),
            ...(data.updatedAt != null && { updatedAt: data.updatedAt }),
            permissions: (data.permissions ?? []).map((permission) => ({
                permissionName: permission.permissionName,
                scope: permission.scope,
                scopeType: permission.scopeType,
                ...(permission.createdAt != null && { createdAt: permission.createdAt }),
                ...(permission.updatedAt != null && { updatedAt: permission.updatedAt })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
