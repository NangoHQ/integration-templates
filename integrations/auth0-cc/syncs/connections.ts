import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderConnectionSchema = z.object({
    id: z.string(),
    name: z.string(),
    display_name: z.string().nullable().optional(),
    strategy: z.string(),
    realms: z.array(z.string()).nullable().optional(),
    is_domain_connection: z.boolean().nullable().optional(),
    show_as_button: z.boolean().nullable().optional(),
    metadata: z.record(z.string(), z.string().nullable()).nullable().optional(),
    options: z.unknown().optional(),
    authentication: z.unknown().optional(),
    connected_accounts: z.unknown().optional()
});

const ConnectionSchema = z.object({
    id: z.string(),
    name: z.string(),
    display_name: z.string().optional(),
    strategy: z.string(),
    realms: z.array(z.string()).optional(),
    is_domain_connection: z.boolean().optional(),
    show_as_button: z.boolean().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    options: z.unknown().optional(),
    authentication: z.unknown().optional(),
    connected_accounts: z.unknown().optional()
});

const CheckpointSchema = z.object({
    from: z.string()
});

const sync = createSync({
    description: 'Sync connections from Auth0.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Connection: ConnectionSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/connections' }],

    exec: async (nango) => {
        await nango.trackDeletesStart('Connection');

        const rawCheckpoint = await nango.getCheckpoint();
        let from: string | undefined;
        if (rawCheckpoint != null) {
            const parsed = CheckpointSchema.safeParse(rawCheckpoint);
            if (parsed.success) {
                from = parsed.data.from;
            }
        }

        const proxyConfig: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/connections/get-all-connections
            endpoint: '/api/v2/connections',
            params: {
                ...(from && { from })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'from',
                cursor_path_in_response: 'next',
                response_path: 'connections',
                limit_name_in_request: 'take',
                limit: 50,
                on_page: async ({ nextPageParam }) => {
                    from = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const connections = [];
            for (const record of batch) {
                const parsed = ProviderConnectionSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse connection: ${parsed.error.message}`);
                }

                const conn = parsed.data;
                connections.push({
                    id: conn.id,
                    name: conn.name,
                    strategy: conn.strategy,
                    ...(conn.display_name != null && { display_name: conn.display_name }),
                    ...(conn.realms != null && { realms: conn.realms }),
                    ...(conn.is_domain_connection != null && { is_domain_connection: conn.is_domain_connection }),
                    ...(conn.show_as_button != null && { show_as_button: conn.show_as_button }),
                    ...(conn.metadata != null && {
                        metadata: Object.fromEntries(Object.entries(conn.metadata).filter(([, v]) => v != null))
                    }),
                    ...(conn.options !== undefined && { options: conn.options }),
                    ...(conn.authentication !== undefined && { authentication: conn.authentication }),
                    ...(conn.connected_accounts !== undefined && { connected_accounts: conn.connected_accounts })
                });
            }

            if (connections.length === 0) {
                continue;
            }

            await nango.batchSave(connections, 'Connection');

            if (from !== undefined) {
                await nango.saveCheckpoint({ from });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Connection');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
