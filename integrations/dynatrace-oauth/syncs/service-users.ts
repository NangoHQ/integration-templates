import { createSync } from 'nango';
import { z } from 'zod';

const ProviderServiceUserSchema = z.object({
    uid: z.string(),
    login: z.string(),
    email: z.string(),
    name: z.string(),
    surname: z.string().optional(),
    type: z.string(),
    userStatus: z.string(),
    description: z.string().optional(),
    createdAt: z.string()
});

const ProviderResponseSchema = z.object({
    results: z.array(ProviderServiceUserSchema),
    totalCount: z.number()
});

const ConnectionConfigSchema = z.object({
    accountUuid: z.string()
});

const ServiceUserSchema = z.object({
    id: z.string(),
    uid: z.string(),
    login: z.string(),
    email: z.string(),
    name: z.string(),
    surname: z.string().optional(),
    type: z.string(),
    userStatus: z.string(),
    description: z.string().optional(),
    createdAt: z.string()
});

const sync = createSync({
    description: 'Sync service (API-only) users in this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        ServiceUser: ServiceUserSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        let accountUuid: string | undefined;

        const parsedConfig = ConnectionConfigSchema.safeParse(connection.connection_config);
        if (parsedConfig.success) {
            accountUuid = parsedConfig.data.accountUuid;
        } else {
            const metadata = await nango.getMetadata();
            const parsedMetadata = ConnectionConfigSchema.safeParse(metadata);
            if (parsedMetadata.success) {
                accountUuid = parsedMetadata.data.accountUuid;
            }
        }

        if (!accountUuid) {
            throw new Error('Missing accountUuid in connection configuration or metadata');
        }

        await nango.trackDeletesStart('ServiceUser');

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/service-users-api/list-service-users
        const response = await nango.get({
            endpoint: `iam/v1/accounts/${encodeURIComponent(accountUuid)}/service-users`,
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new Error(`Failed to parse service users response: ${parsedResponse.error.message}`);
        }

        const serviceUsers = parsedResponse.data.results.map((user) => ({
            id: user.uid,
            uid: user.uid,
            login: user.login,
            email: user.email,
            name: user.name,
            ...(user.surname != null && { surname: user.surname }),
            type: user.type,
            userStatus: user.userStatus,
            ...(user.description != null && { description: user.description }),
            createdAt: user.createdAt
        }));

        if (serviceUsers.length > 0) {
            await nango.batchSave(serviceUsers, 'ServiceUser');
        }

        await nango.trackDeletesEnd('ServiceUser');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
