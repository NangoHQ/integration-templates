import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderRoleSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional()
});

const RoleSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional()
});

const CheckpointSchema = z.object({
    page: z.number()
});

const sync = createSync({
    description: 'Sync roles from Auth0.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Role: RoleSchema
    },
    // https://auth0.com/docs/api/management/v2/roles/get-roles
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/roles'
        }
    ],

    exec: async (nango) => {
        // Auth0 GET /api/v2/roles does not support filtering by updated timestamp,
        // cursors, or since_id. It only provides offset pagination, so this is a
        // checkpointed full refresh that resumes from the last page on failure.
        const checkpoint = await nango.getCheckpoint();
        let page: number | undefined = checkpoint?.page ?? 0;

        await nango.trackDeletesStart('Role');

        const proxyConfig: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/roles/get-roles
            endpoint: '/api/v2/roles',
            params: {
                include_totals: 'true'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page ?? 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'roles',
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderRoleSchema).safeParse(batch);
            if (!parsed.success) {
                throw new Error(`Failed to parse roles: ${parsed.error.message}`);
            }

            const roles = parsed.data.map((record) => ({
                id: record.id,
                ...(record.name != null && { name: record.name }),
                ...(record.description != null && { description: record.description })
            }));

            if (roles.length > 0) {
                await nango.batchSave(roles, 'Role');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Role');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
