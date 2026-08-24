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

const CheckpointSchema = z.object({
    usersAfter: z.string(),
    currentUserId: z.string(),
    factorsAfter: z.string()
});

const StoredCheckpointSchema = z.object({
    usersAfter: z.string().optional(),
    currentUserId: z.string().optional(),
    factorsAfter: z.string().optional()
});

const sync = createSync({
    description: 'Sync user factors.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Factor: FactorSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = StoredCheckpointSchema.parse(rawCheckpoint ?? {});

        let usersAfter: string | undefined = checkpoint.usersAfter || undefined;
        let currentUserId: string | undefined = checkpoint.currentUserId || undefined;
        const factorsAfter: string | undefined = checkpoint.factorsAfter || undefined;

        await nango.trackDeletesStart('Factor');

        const usersParams: Record<string, string | number> = {
            limit: 200
        };
        if (usersAfter) {
            usersParams['after'] = usersAfter;
        }

        const usersConfig: ProxyConfiguration = {
            // https://developer.okta.com/docs/reference/api/users/#list-users
            endpoint: '/api/v1/users',
            paginate: {
                type: 'link',
                limit_name_in_request: 'limit',
                link_rel_in_response_header: 'next',
                limit: 200
            },
            params: usersParams,
            retries: 3
        };

        for await (const rawUsers of nango.paginate(usersConfig)) {
            const users = z.array(UserRecordSchema).parse(rawUsers);

            for (const user of users) {
                if (currentUserId && user.id !== currentUserId) {
                    continue;
                }

                const isResumedUser = currentUserId !== undefined;
                currentUserId = undefined;

                const userId = user.id;

                const factorsParams: Record<string, string | number> = {
                    limit: 100
                };
                if (isResumedUser && factorsAfter) {
                    factorsParams['after'] = factorsAfter;
                }

                const factorsConfig: ProxyConfiguration = {
                    // https://developer.okta.com/docs/reference/api/factors/
                    endpoint: `/api/v1/users/${encodeURIComponent(userId)}/factors`,
                    paginate: {
                        type: 'link',
                        limit_name_in_request: 'limit',
                        link_rel_in_response_header: 'next',
                        limit: 100
                    },
                    params: factorsParams,
                    retries: 3
                };

                let nextFactorsAfter: string | undefined;

                for await (const rawFactors of nango.paginate(factorsConfig)) {
                    const factors = z.array(OktaFactorSchema).parse(rawFactors);

                    const records = factors.map((factor) => ({
                        id: factor.id,
                        userId,
                        factorType: factor.factorType,
                        provider: factor.provider,
                        status: factor.status
                    }));

                    if (records.length > 0) {
                        await nango.batchSave(records, 'Factor');
                    }

                    const lastFactor = factors[factors.length - 1];
                    if (lastFactor) {
                        nextFactorsAfter = lastFactor.id;
                    }

                    await nango.saveCheckpoint({
                        usersAfter: usersAfter ?? '',
                        currentUserId: userId,
                        factorsAfter: nextFactorsAfter ?? ''
                    });
                }

                await nango.saveCheckpoint({
                    usersAfter: usersAfter ?? '',
                    currentUserId: userId,
                    factorsAfter: ''
                });
            }

            const lastUser = users[users.length - 1];
            if (lastUser) {
                usersAfter = lastUser.id;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Factor');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
