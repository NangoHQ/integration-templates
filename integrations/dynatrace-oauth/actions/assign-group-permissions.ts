import { z } from 'zod';
import { createAction } from 'nango';

const PermissionSchema = z.object({
    permissionName: z.string().describe('Permission name. Example: "account-viewer"'),
    scope: z
        .string()
        .describe(
            'Scope value. For scopeType "account" this is the account UUID; for "tenant" an environment ID; for "management-zone" the format "{environmentId}:{managementZoneId}".'
        ),
    scopeType: z.enum(['account', 'tenant', 'management-zone']).describe('Scope type for the permission.')
});

const InputSchema = z.object({
    groupUuid: z.string().describe('Group UUID to assign permissions to. Example: "0bb8915e-fe63-4e37-a1ba-102e7daa375a"'),
    permissions: z.array(PermissionSchema).min(1).describe('One or more permissions to assign to the group.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Add one or more direct permissions to a group, without affecting existing ones.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account-idm-write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let rawAccountUuid = connection.connection_config?.['accountUuid'];
        if (typeof rawAccountUuid !== 'string' || rawAccountUuid.length === 0) {
            const metadata = await nango.getMetadata();
            rawAccountUuid = metadata?.['accountUuid'];
        }

        if (typeof rawAccountUuid !== 'string' || rawAccountUuid.length === 0) {
            throw new nango.ActionError({
                type: 'missing_account_uuid',
                message: 'accountUuid is missing from the connection configuration and metadata.'
            });
        }

        const accountUuid = rawAccountUuid;
        const groupUuid = input.groupUuid;

        await nango.post({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/groups/permissions/post-group-permissions
            endpoint: `/iam/v1/accounts/${encodeURIComponent(accountUuid)}/groups/${encodeURIComponent(groupUuid)}/permissions`,
            data: input.permissions,
            retries: 10
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
