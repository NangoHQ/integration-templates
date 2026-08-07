import { createSync } from 'nango';
import { z } from 'zod';

const ProviderServiceUserSchema = z.object({
    uid: z.string(),
    login: z.string().nullish(),
    email: z.string().nullish(),
    name: z.string().nullish(),
    surname: z.string().nullish(),
    type: z.string().nullish(),
    userStatus: z.string().nullish(),
    description: z.string().nullish(),
    createdAt: z.string().nullish()
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
    login: z.string().optional(),
    email: z.string().optional(),
    name: z.string().optional(),
    surname: z.string().optional(),
    type: z.string().optional(),
    userStatus: z.string().optional(),
    description: z.string().optional(),
    createdAt: z.string().optional()
});

const sync = createSync({
    description: 'Sync service (API-only) users in this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    trackDeletes: true,
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

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/service-users-api/list-service-users
        const response = await nango.get({
            endpoint: `iam/v1/accounts/${encodeURIComponent(accountUuid)}/service-users`,
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new Error(`Failed to parse service users response: ${parsedResponse.error.message}`);
        }

        await nango.trackDeletesStart('ServiceUser');

        const serviceUsers = parsedResponse.data.results.map((user) => ({
            id: user.uid,
            uid: user.uid,
            ...(user.login != null && { login: user.login }),
            ...(user.email != null && { email: user.email }),
            ...(user.name != null && { name: user.name }),
            ...(user.surname != null && { surname: user.surname }),
            ...(user.type != null && { type: user.type }),
            ...(user.userStatus != null && { userStatus: user.userStatus }),
            ...(user.description != null && { description: user.description }),
            ...(user.createdAt != null && { createdAt: user.createdAt })
        }));

        if (serviceUsers.length > 0) {
            await nango.batchSave(serviceUsers, 'ServiceUser');
        }

        await nango.trackDeletesEnd('ServiceUser');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
