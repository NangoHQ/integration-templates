import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyUuid: z.string().describe('Policy UUID. Example: "6e6edf99-3ef3-40f5-adc5-635401719672"'),
    name: z.string().optional().describe('Policy name'),
    description: z.string().optional().describe('Policy description'),
    statementQuery: z.string().optional().describe('Policy statement query. Example: "ALLOW iam:groups:read, iam:users:read;"')
});

const ProviderPolicySchema = z.object({
    uuid: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    statementQuery: z.string()
});

const OutputSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    description: z.string().optional(),
    statementQuery: z.string()
});

const ConnectionConfigSchema = z.object({
    accountUuid: z.string()
});

const MetadataSchema = z.object({
    accountUuid: z.string()
});

const action = createAction({
    description: "Update an existing account-level policy's name/description/statementQuery",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['iam-policies-management'],

    exec: async (nango, input) => {
        let accountUuid;

        const connection = await nango.getConnection();
        const connectionConfigResult = ConnectionConfigSchema.safeParse(connection.connection_config);
        if (connectionConfigResult.success) {
            accountUuid = connectionConfigResult.data.accountUuid;
        }

        if (!accountUuid) {
            const metadata = await nango.getMetadata();
            const metadataResult = MetadataSchema.safeParse(metadata);
            if (metadataResult.success) {
                accountUuid = metadataResult.data.accountUuid;
            }
        }

        if (!accountUuid) {
            throw new nango.ActionError({
                type: 'missing_account_uuid',
                message: 'accountUuid is required in connection config or metadata.'
            });
        }

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api
        const getResponse = await nango.get({
            endpoint: `iam/v1/repo/account/${encodeURIComponent(accountUuid)}/policies/${encodeURIComponent(input.policyUuid)}`,
            retries: 3
        });

        const existingPolicy = ProviderPolicySchema.parse(getResponse.data);

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api
        await nango.put({
            endpoint: `iam/v1/repo/account/${encodeURIComponent(accountUuid)}/policies/${encodeURIComponent(input.policyUuid)}`,
            data: {
                name: input.name !== undefined ? input.name : existingPolicy.name,
                description: input.description !== undefined ? input.description : existingPolicy.description,
                statementQuery: input.statementQuery !== undefined ? input.statementQuery : existingPolicy.statementQuery
            },
            retries: 3
        });

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api
        const confirmResponse = await nango.get({
            endpoint: `iam/v1/repo/account/${encodeURIComponent(accountUuid)}/policies/${encodeURIComponent(input.policyUuid)}`,
            retries: 3
        });

        const providerPolicy = ProviderPolicySchema.parse(confirmResponse.data);

        return {
            uuid: providerPolicy.uuid,
            name: providerPolicy.name,
            ...(providerPolicy.description != null && { description: providerPolicy.description }),
            statementQuery: providerPolicy.statementQuery
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
