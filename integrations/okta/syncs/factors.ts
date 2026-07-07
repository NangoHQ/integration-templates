import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const FactorSchema = z.object({
    id: z.string(),
    userId: z.string(),
    factorType: z.string(),
    provider: z.string(),
    status: z.string()
});

const UserRecordSchema = z.object({
    id: z.string()
});

const OktaFactorSchema = z.object({
    id: z.string(),
    factorType: z.string(),
    provider: z.string(),
    status: z.string()
});

const sync = createSync({
    description: 'Sync user factors.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Factor: FactorSchema
    },

    exec: async (nango) => {
        const users: Array<{ id: string }> = [];

        const usersConfig: ProxyConfiguration = {
            // https://developer.okta.com/docs/reference/api/users/#list-users
            endpoint: '/api/v1/users',
            paginate: {
                type: 'link',
                limit_name_in_request: 'limit',
                link_rel_in_response_header: 'next',
                limit: 200
            },
            retries: 3
        };

        for await (const rawUsers of nango.paginate(usersConfig)) {
            for (const rawUser of rawUsers) {
                const parsed = UserRecordSchema.safeParse(rawUser);
                if (!parsed.success) {
                    throw new Error(`Invalid user record: ${JSON.stringify(parsed.error.issues)}`);
                }
                users.push(parsed.data);
            }
        }

        if (users.length === 0) {
            await nango.log('No users found, skipping factor sync');
            return;
        }

        await nango.trackDeletesStart('Factor');

        for (const user of users) {
            const userId = user.id;

            const proxyConfig: ProxyConfiguration = {
                // https://developer.okta.com/docs/reference/api/factors/
                endpoint: `/api/v1/users/${encodeURIComponent(userId)}/factors`,
                paginate: {
                    type: 'link',
                    limit_name_in_request: 'limit',
                    link_rel_in_response_header: 'next',
                    limit: 100
                },
                retries: 3
            };

            for await (const factors of nango.paginate(proxyConfig)) {
                const parsedFactors = z.array(OktaFactorSchema).safeParse(factors);
                if (!parsedFactors.success) {
                    throw new Error(`Invalid factors response for user ${userId}: ${JSON.stringify(parsedFactors.error.issues)}`);
                }

                const records = parsedFactors.data.map((factor) => ({
                    id: factor.id,
                    userId,
                    factorType: factor.factorType,
                    provider: factor.provider,
                    status: factor.status
                }));

                if (records.length > 0) {
                    await nango.batchSave(records, 'Factor');
                }
            }
        }

        await nango.trackDeletesEnd('Factor');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
