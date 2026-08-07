import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountUuid: z.string().describe('Dynatrace account UUID. Example: "12345678-1234-1234-1234-123456789abc"')
});

const PermissionSchema = z.object({
    permissionName: z.string().describe('Permission name. Example: "account-company-info"'),
    scope: z.string().describe('Scope identifier: an account UUID, environment ID, or "{environmentId}:{managementZoneId}" for a management zone.'),
    scopeType: z.enum(['account', 'tenant', 'management-zone']).describe('Scope type.')
});

const InputSchema = z.object({
    groupUuid: z.string().describe('Group UUID. Example: "0bb8915e-fe63-4e37-a1ba-102e7daa375a"'),
    permissions: z.array(PermissionSchema).describe('Full list of direct permissions to set on the group. Replaces existing direct permissions.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: "Replace a group's entire direct-permission list in one call.",
    version: '1.0.0',
    metadata: MetadataSchema,
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account-idm-write'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/permission-management-api/put-permissions
        await nango.put({
            endpoint: `iam/v1/accounts/${encodeURIComponent(metadata.accountUuid)}/groups/${encodeURIComponent(input.groupUuid)}/permissions`,
            data: input.permissions,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
