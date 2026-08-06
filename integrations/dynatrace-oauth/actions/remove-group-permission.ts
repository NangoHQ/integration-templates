import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupUuid: z.string().describe('The UUID of the user group. Example: "0bb8915e-fe63-4e37-a1ba-102e7daa375a"'),
    scopeType: z.string().describe('The type of the permission scope. Example: "account"'),
    scope: z.string().describe('The scope of the permission. Example: "9610a717-798c-423b-a80f-97cfebe72f89"'),
    permissionName: z.string().describe('The name of the permission. Example: "account-viewer"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const MetadataSchema = z.object({
    accountUuid: z.string()
});

const action = createAction({
    description: 'Remove one specific direct permission from a group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account-idm-write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'Missing accountUuid in connection metadata.'
            });
        }

        const accountUuid = parsedMetadata.data.accountUuid;

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/permission-management-api/delete-permissions
        await nango.delete({
            endpoint: `iam/v1/accounts/${encodeURIComponent(accountUuid)}/groups/${encodeURIComponent(input.groupUuid)}/permissions`,
            params: {
                'scope-type': input.scopeType,
                scope: input.scope,
                'permission-name': input.permissionName
            },
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
