import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderUserSchema = z.object({
    id: z.string(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    organizations: z.array(z.string()).nullable().optional()
});

const UserSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    organizations: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    skip: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Full-refresh sync of organization users.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        // Blocker: GET /v1/user/ does not support incremental filters (e.g. date_updated__gt).
        // No changed-since or deleted-record endpoint available. Full refresh required.
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        let skip: number | undefined = checkpoint?.skip ?? 0;

        await nango.trackDeletesStart('User');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.close.com/
            endpoint: '/v1/user/',
            paginate: {
                type: 'offset',
                offset_name_in_request: '_skip',
                offset_start_value: skip ?? 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: '_limit',
                limit: 200,
                response_path: 'data',
                on_page: async ({ nextPageParam }) => {
                    skip = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const items = z.array(z.unknown()).parse(page);

            const users = items.map((item) => {
                const validated = ProviderUserSchema.safeParse(item);
                if (!validated.success) {
                    throw new Error(`Invalid user record: ${validated.error.message}`);
                }

                const record = validated.data;
                return {
                    id: record.id,
                    ...(record.first_name != null && { first_name: record.first_name }),
                    ...(record.last_name != null && { last_name: record.last_name }),
                    ...(record.email != null && { email: record.email }),
                    ...(record.organizations != null && { organizations: record.organizations })
                };
            });

            if (users.length > 0) {
                await nango.batchSave(users, 'User');
            }

            if (skip !== undefined) {
                await nango.saveCheckpoint({ skip });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
