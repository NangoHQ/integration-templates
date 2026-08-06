import { createSync } from 'nango';
import { z } from 'zod';

const EnvironmentSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    active: z.boolean().optional(),
    url: z.string().optional()
});

const ProviderEnvironmentSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    active: z.boolean().optional().nullable(),
    url: z.string().optional().nullable()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderEnvironmentSchema.passthrough())
});

const AccountUuidSchema = z.object({
    accountUuid: z.string()
});

const sync = createSync({
    description: 'Sync the monitoring environments (tenants) belonging to this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Environment: EnvironmentSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const metadata = await nango.getMetadata();

        let accountUuid: string | undefined;
        const configResult = AccountUuidSchema.safeParse(connection.connection_config);
        if (configResult.success) {
            accountUuid = configResult.data.accountUuid;
        } else {
            const metadataResult = AccountUuidSchema.safeParse(metadata);
            if (metadataResult.success) {
                accountUuid = metadataResult.data.accountUuid;
            }
        }

        if (!accountUuid) {
            throw new Error('Missing accountUuid in connection config or metadata');
        }

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/environment-management-api/get-environments-api-v2
        const response = await nango.get({
            endpoint: `env/v2/accounts/${encodeURIComponent(accountUuid)}/environments`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse environments response: ${parsed.error.message}`);
        }

        await nango.trackDeletesStart('Environment');

        const environments = parsed.data.data.map((env) => {
            const record: { id: string; name?: string; active?: boolean; url?: string } = {
                id: env.id
            };
            if (env.name != null) {
                record.name = env.name;
            }
            if (env.active != null) {
                record.active = env.active;
            }
            if (env.url != null) {
                record.url = env.url;
            }
            return record;
        });

        if (environments.length > 0) {
            await nango.batchSave(environments, 'Environment');
        }

        await nango.trackDeletesEnd('Environment');
    }
});

export default sync;
