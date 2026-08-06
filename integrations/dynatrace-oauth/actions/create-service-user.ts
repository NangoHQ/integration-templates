import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the service user. Example: "Nango Registry Test SU 3"'),
    description: z.string().optional().describe('Description of the service user. Example: "Test service user for Nango registry"'),
    accountUuid: z.string().optional().describe('Dynatrace account UUID. Falls back to connection_config.accountUuid if omitted.')
});

const ConnectionConfigSchema = z.object({
    accountUuid: z.string().min(1)
});

const ProviderResponseSchema = z.object({
    uid: z.string(),
    email: z.string(),
    name: z.string(),
    surname: z.string(),
    createdAt: z.string(),
    groupUuid: z.string()
});

const OutputSchema = z.object({
    uid: z.string(),
    email: z.string(),
    name: z.string(),
    surname: z.string().optional(),
    createdAt: z.string().optional(),
    groupUuid: z.string().optional()
});

const action = createAction({
    description: 'Create a new service user (API-only identity, no login/human access).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['iam:service-users:use'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let accountUuid = input.accountUuid;

        if (!accountUuid) {
            const connection = await nango.getConnection();
            const connectionConfigParse = ConnectionConfigSchema.safeParse(connection.connection_config);
            if (!connectionConfigParse.success) {
                throw new nango.ActionError({
                    type: 'missing_account_uuid',
                    message: 'accountUuid is required in input or connection_config.'
                });
            }
            accountUuid = connectionConfigParse.data.accountUuid;
        }

        const response = await nango.post({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/service-users-api/post-service-user
            endpoint: `/iam/v1/accounts/${encodeURIComponent(accountUuid)}/service-users`,
            data: {
                name: input.name,
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            uid: providerResponse.uid,
            email: providerResponse.email,
            name: providerResponse.name,
            ...(providerResponse.surname !== undefined && { surname: providerResponse.surname }),
            ...(providerResponse.createdAt !== undefined && { createdAt: providerResponse.createdAt }),
            ...(providerResponse.groupUuid !== undefined && { groupUuid: providerResponse.groupUuid })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
