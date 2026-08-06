import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupUuid: z.string().describe('Group UUID. Example: "0bb8915e-fe63-4e37-a1ba-102e7daa375a"')
});

const ConnectionSchema = z.object({
    connection_config: z.object({
        accountUuid: z.string()
    })
});

const MetadataSchema = z.object({
    accountUuid: z.string().optional()
});

const ProviderResponseSchema = z.object({
    policyUuids: z.array(z.string())
});

const OutputSchema = z.object({
    policyUuids: z.array(z.string())
});

const action = createAction({
    description: 'List just the policy uuids bound to one specific group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['iam-policies-management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const parsedConnection = ConnectionSchema.safeParse(connection);
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        const accountUuid = parsedConnection.data?.connection_config.accountUuid || parsedMetadata.data?.accountUuid;
        if (!accountUuid) {
            throw new nango.ActionError({
                type: 'missing_account_uuid',
                message: 'accountUuid is required in connection_config or metadata.'
            });
        }

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/iam-bindings-api
            endpoint: `/iam/v1/repo/account/${encodeURIComponent(accountUuid)}/bindings/groups/${encodeURIComponent(input.groupUuid)}`,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);
        return {
            policyUuids: providerData.policyUuids
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
