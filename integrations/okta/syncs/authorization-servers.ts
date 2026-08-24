import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderAuthorizationServerSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    audiences: z.array(z.string()).optional(),
    issuer: z.string().optional(),
    status: z.string().optional(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    _links: z.unknown().optional()
});

const AuthorizationServerSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    audiences: z.array(z.string()).optional(),
    issuer: z.string().optional(),
    status: z.string().optional(),
    created: z.string().optional(),
    lastUpdated: z.string().optional()
});

const sync = createSync({
    description: 'Sync authorization servers.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        AuthorizationServer: AuthorizationServerSchema
    },

    exec: async (nango) => {
        // The Okta Authorization Servers API does not support changed-since filters,
        // deleted-record endpoints, or resumable cursors for change tracking, so we
        // perform a full snapshot and use trackDeletesStart/trackDeletesEnd.

        await nango.trackDeletesStart('AuthorizationServer');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.okta.com/docs/reference/api/authorization-servers/#list-authorization-servers
            endpoint: '/api/v1/authorizationServers',
            params: {
                limit: 200
            },
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'limit',
                limit: 200
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const servers = page.map((record: unknown) => {
                const parsed = ProviderAuthorizationServerSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse authorization server: ${parsed.error.message}`);
                }
                const data = parsed.data;
                return {
                    id: data.id,
                    name: data.name,
                    ...(data.description != null && { description: data.description }),
                    ...(data.audiences != null && { audiences: data.audiences }),
                    ...(data.issuer != null && { issuer: data.issuer }),
                    ...(data.status != null && { status: data.status }),
                    ...(data.created != null && { created: data.created }),
                    ...(data.lastUpdated != null && { lastUpdated: data.lastUpdated })
                };
            });

            if (servers.length > 0) {
                await nango.batchSave(servers, 'AuthorizationServer');
            }
        }

        await nango.trackDeletesEnd('AuthorizationServer');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
