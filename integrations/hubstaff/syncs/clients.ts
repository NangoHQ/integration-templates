import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OrganizationSchema = z.object({
    id: z.number()
});

const ClientSchema = z
    .object({
        id: z.number(),
        name: z.string().optional(),
        status: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const ClientModelSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    organization_id: z.string().optional()
});

const sync = createSync({
    description: 'Sync clients across all organizations.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Client: ClientModelSchema
    },

    exec: async (nango) => {
        // Full refresh: the list-clients endpoint does not expose any
        // incremental filter (no updated_since, modified_after, or cursor).
        const orgsProxyConfig: ProxyConfiguration = {
            // https://developer.hubstaff.com/
            endpoint: 'v2/organizations',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'page_start_id',
                cursor_path_in_response: 'pagination.next_page_start_id',
                response_path: 'organizations',
                limit_name_in_request: 'page_limit',
                limit: 100
            },
            retries: 3
        };

        const orgIds: number[] = [];
        for await (const orgsPage of nango.paginate(orgsProxyConfig)) {
            for (const rawOrg of orgsPage) {
                const parsed = OrganizationSchema.safeParse(rawOrg);
                if (!parsed.success) {
                    throw new Error('Failed to parse organization item: ' + parsed.error.message);
                }
                orgIds.push(parsed.data.id);
            }
        }

        await nango.trackDeletesStart('Client');

        for (const orgId of orgIds) {
            const clientsProxyConfig: ProxyConfiguration = {
                // https://developer.hubstaff.com/
                endpoint: `v2/organizations/${encodeURIComponent(String(orgId))}/clients`,
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'page_start_id',
                    cursor_path_in_response: 'pagination.next_page_start_id',
                    response_path: 'clients',
                    limit_name_in_request: 'page_limit',
                    limit: 100
                },
                retries: 3
            };

            for await (const clientsPage of nango.paginate(clientsProxyConfig)) {
                const clients = clientsPage
                    .map((client) => {
                        const parsed = ClientSchema.safeParse(client);
                        if (!parsed.success) {
                            throw new Error('Failed to parse client item: ' + parsed.error.message);
                        }
                        return parsed.data;
                    })
                    .map((client) => ({
                        id: String(client.id),
                        ...(client.name !== undefined && client.name !== null && { name: client.name }),
                        ...(client.status !== undefined && client.status !== null && { status: client.status }),
                        ...(client.created_at !== undefined && client.created_at !== null && { created_at: client.created_at }),
                        ...(client.updated_at !== undefined && client.updated_at !== null && { updated_at: client.updated_at }),
                        organization_id: String(orgId)
                    }));

                if (clients.length > 0) {
                    await nango.batchSave(clients, 'Client');
                }
            }
        }

        await nango.trackDeletesEnd('Client');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
