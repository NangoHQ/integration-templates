import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RawGrantSchema = z.object({
    id: z.string(),
    clientID: z.string().optional(),
    user_id: z.string().optional(),
    audience: z.string().optional(),
    scope: z.array(z.string()).optional()
});

const GrantSchema = z.object({
    id: z.string(),
    clientID: z.string().optional(),
    user_id: z.string().optional(),
    audience: z.string().optional(),
    scope: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    page: z.number()
});

const sync = createSync({
    description: 'Sync OAuth grants from Auth0.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/grants' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    scopes: ['read:grants'],
    models: {
        Grant: GrantSchema
    },

    exec: async (nango) => {
        // Auth0 GET /api/v2/grants does not support filtering by updated timestamp,
        // cursors, or since_id. It only provides offset pagination, so this is a
        // checkpointed full refresh that resumes from the last page on failure.
        const checkpoint = await nango.getCheckpoint();
        let page: number | undefined = checkpoint?.page ?? 0;

        await nango.trackDeletesStart('Grant');

        const proxyConfig: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/grants/get-grants
            endpoint: '/api/v2/grants',
            params: {
                per_page: 100
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page ?? 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const grants = batch.map((item) => {
                const record = RawGrantSchema.parse(item);
                return {
                    id: record.id,
                    ...(record.clientID != null && { clientID: record.clientID }),
                    ...(record.user_id != null && { user_id: record.user_id }),
                    ...(record.audience != null && { audience: record.audience }),
                    ...(record.scope != null && { scope: record.scope })
                };
            });

            if (grants.length > 0) {
                await nango.batchSave(grants, 'Grant');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Grant');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
