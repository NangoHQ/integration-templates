import { createSync } from 'nango';
import { z } from 'zod';

const OrganizationSchema = z
    .object({
        id: z.number(),
        name: z.string().optional()
    })
    .passthrough();

const ClientSchema = z
    .object({
        id: z.number(),
        name: z.string().optional(),
        status: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OrganizationsResponseSchema = z
    .object({
        organizations: z.array(z.unknown())
    })
    .passthrough();

const ClientsResponseSchema = z
    .object({
        clients: z.array(z.unknown())
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
        // Confirmed live during registry audit on 2026-07-30.

        // https://developer.hubstaff.com/
        const orgsResponse = await nango.get({
            endpoint: 'v2/organizations',
            retries: 3
        });

        const orgsResult = OrganizationsResponseSchema.safeParse(orgsResponse.data);
        if (!orgsResult.success) {
            throw new Error('Failed to parse organizations response: ' + orgsResult.error.message);
        }

        const organizations = orgsResult.data.organizations.map((org) => {
            const parsed = OrganizationSchema.safeParse(org);
            if (!parsed.success) {
                throw new Error('Failed to parse organization item: ' + parsed.error.message);
            }
            return parsed.data;
        });

        await nango.trackDeletesStart('Client');

        for (const org of organizations) {
            // https://developer.hubstaff.com/
            const clientsResponse = await nango.get({
                endpoint: `v2/organizations/${encodeURIComponent(String(org.id))}/clients`,
                retries: 3
            });

            const clientsResult = ClientsResponseSchema.safeParse(clientsResponse.data);
            if (!clientsResult.success) {
                throw new Error('Failed to parse clients response: ' + clientsResult.error.message);
            }

            const clients = clientsResult.data.clients
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
                    organization_id: String(org.id)
                }));

            if (clients.length > 0) {
                await nango.batchSave(clients, 'Client');
            }
        }

        await nango.trackDeletesEnd('Client');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
