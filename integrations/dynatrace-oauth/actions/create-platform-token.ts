import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountUuid: z
        .string()
        .optional()
        .describe('Dynatrace account UUID. If omitted, it will be read from the connection configuration. Example: "9610a717-798c-423b-a80f-97cfebe72f89"'),
    name: z.string().describe('Name of the platform token. Example: "Nango Test Token"'),
    scope: z.array(z.string()).describe('OAuth scopes for the token. Example: ["storage:logs:read"]'),
    tags: z.array(z.string()).optional(),
    expirationDate: z.string().optional().describe('ISO 8601 expiration date. Example: "2027-01-01T00:00:00Z"'),
    userUuid: z.string().optional().describe('User UUID to associate with the token.')
});

const ConnectionConfigSchema = z.object({
    accountUuid: z.string()
});

const EnvironmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    active: z.boolean(),
    url: z.string()
});

const EnvironmentListSchema = z.object({
    data: z.array(EnvironmentSchema)
});

const PlatformTokenSecretSchema = z.object({
    name: z.string(),
    tokenId: z.string(),
    token: z.string()
});

const OutputSchema = z.object({
    name: z.string(),
    tokenId: z.string(),
    token: z.string()
});

const action = createAction({
    description: "Create a new platform token scoped to a specific environment, for use against Dynatrace's environment-level Platform APIs.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['platform-token:tokens:manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let accountUuid = input.accountUuid;
        if (!accountUuid) {
            const connection = await nango.getConnection();
            const configParse = ConnectionConfigSchema.safeParse(connection.connection_config);
            if (!configParse.success) {
                throw new nango.ActionError({
                    type: 'missing_account_uuid',
                    message: 'accountUuid is missing from input and connection configuration.'
                });
            }
            accountUuid = configParse.data.accountUuid;
        }

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/environment-management-api/get-environments-api-v2
        const envResponse = await nango.get({
            endpoint: `/env/v2/accounts/${encodeURIComponent(accountUuid)}/environments`,
            retries: 3
        });

        const envList = EnvironmentListSchema.parse(envResponse.data);
        const firstEnv = envList.data[0];
        if (!firstEnv) {
            throw new nango.ActionError({
                type: 'no_environments',
                message: 'No environments found in the account.'
            });
        }

        const environmentId = firstEnv.id;
        const resource = `urn:dtenvironment:${environmentId}`;

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/platform-tokens-api/post-platform-token
        const response = await nango.post({
            endpoint: `/iam/v1/accounts/${encodeURIComponent(accountUuid)}/platform-tokens`,
            data: {
                name: input.name,
                scope: input.scope,
                resource: [resource],
                ...(input.tags !== undefined && { tags: input.tags }),
                ...(input.expirationDate !== undefined && { expirationDate: input.expirationDate }),
                ...(input.userUuid !== undefined && { userUuid: input.userUuid })
            },
            retries: 10
        });

        const token = PlatformTokenSecretSchema.parse(response.data);

        return {
            name: token.name,
            tokenId: token.tokenId,
            token: token.token
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
