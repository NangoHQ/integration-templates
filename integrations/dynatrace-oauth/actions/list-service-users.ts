import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    accountUuid: z.string().optional().describe('Dynatrace account UUID. If omitted, the value is read from the connection configuration.')
});

const ProviderServiceUserSchema = z.object({
    uid: z.string(),
    login: z.string().nullish(),
    email: z.string().nullish(),
    name: z.string().nullish(),
    surname: z.string().nullish(),
    type: z.literal('SERVICE_EXTERNAL'),
    userStatus: z.string().nullish(),
    description: z.string().nullish(),
    createdAt: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    results: z.array(ProviderServiceUserSchema),
    totalCount: z.number()
});

const ServiceUserSchema = z.object({
    uid: z.string(),
    login: z.string().optional(),
    email: z.string().optional(),
    name: z.string().optional(),
    surname: z.string().optional(),
    type: z.literal('SERVICE_EXTERNAL'),
    userStatus: z.string().optional(),
    description: z.string().optional(),
    createdAt: z.string().optional()
});

const OutputSchema = z.object({
    results: z.array(ServiceUserSchema),
    totalCount: z.number()
});

const ConnectionConfigSchema = z.object({
    accountUuid: z.string()
});

const action = createAction({
    description: 'List service (non-human, API-only) users in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account-idm-read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let accountUuid = input.accountUuid;

        if (!accountUuid) {
            const connection = await nango.getConnection();
            const parsedConfig = ConnectionConfigSchema.safeParse(connection.connection_config);
            if (!parsedConfig.success) {
                throw new nango.ActionError({
                    type: 'invalid_connection_config',
                    message: 'Missing or invalid accountUuid in connection configuration.'
                });
            }
            accountUuid = parsedConfig.data.accountUuid;
        }

        const config: ProxyConfiguration = {
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/service-users-api
            endpoint: `iam/v1/accounts/${encodeURIComponent(accountUuid)}/service-users`,
            retries: 3
        };

        const response = await nango.get(config);

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape.',
                details: parsedResponse.error.issues
            });
        }

        const providerData = parsedResponse.data;

        return {
            results: providerData.results.map((user) => ({
                uid: user.uid,
                type: user.type,
                ...(user.login != null && { login: user.login }),
                ...(user.email != null && { email: user.email }),
                ...(user.name != null && { name: user.name }),
                ...(user.surname != null && { surname: user.surname }),
                ...(user.userStatus != null && { userStatus: user.userStatus }),
                ...(user.description != null && { description: user.description }),
                ...(user.createdAt != null && { createdAt: user.createdAt })
            })),
            totalCount: providerData.totalCount
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
