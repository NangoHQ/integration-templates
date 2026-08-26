import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OrganizationSchema = z.object({
    id: z.number()
});

const OrganizationListSchema = z.object({
    organizations: z.array(OrganizationSchema),
    pagination: z
        .object({
            next_page_start_id: z.union([z.string(), z.number()]).nullish()
        })
        .optional()
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

const ClientListSchema = z.object({
    clients: z.array(ClientSchema),
    pagination: z
        .object({
            next_page_start_id: z.union([z.string(), z.number()]).nullish()
        })
        .optional()
});

const ClientModelSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    organization_id: z.string().optional()
});

const CheckpointSchema = z.object({
    state_json: z.string()
});

const StateSchema = z.object({
    orgCursor: z.string().optional(),
    orgId: z.number().optional(),
    clientCursor: z.string().optional()
});

function parseStateJson(json: string): z.infer<typeof StateSchema> {
    const parsed = JSON.parse(json);
    const result = StateSchema.safeParse(parsed);
    if (!result.success) {
        throw new Error('Invalid checkpoint state: ' + result.error.message);
    }
    return result.data;
}

const sync = createSync({
    description: 'Sync clients across all organizations.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Client: ClientModelSchema
    },

    exec: async (nango) => {
        // Full refresh: the list-clients endpoint does not expose any
        // incremental filter (no updated_since, modified_after, or cursor).
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = rawCheckpoint === null || rawCheckpoint === undefined ? null : CheckpointSchema.safeParse(rawCheckpoint);
        if (checkpointResult !== null && !checkpointResult.success) {
            throw new Error('Invalid checkpoint: ' + checkpointResult.error.message);
        }

        const state = checkpointResult?.success ? parseStateJson(checkpointResult.data.state_json) : {};

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('Client');

        let orgCursor = state.orgCursor;
        let resumeOrgId = state.orgId;
        let resumeClientCursor = state.clientCursor;

        while (true) {
            const orgsProxyConfig: ProxyConfiguration = {
                // https://developer.hubstaff.com/
                endpoint: 'v2/organizations',
                params: {
                    page_limit: 100,
                    ...(orgCursor !== undefined && { page_start_id: orgCursor })
                },
                retries: 3
            };

            const orgsResponse = await nango.proxy(orgsProxyConfig);
            const parsedOrgs = OrganizationListSchema.safeParse(orgsResponse.data);
            if (!parsedOrgs.success) {
                throw new Error('Failed to parse organizations: ' + parsedOrgs.error.message);
            }

            const orgs = parsedOrgs.data.organizations;
            const rawNextOrgCursor = parsedOrgs.data.pagination?.next_page_start_id;
            const nextOrgCursor = rawNextOrgCursor != null ? String(rawNextOrgCursor) : undefined;

            for (let i = 0; i < orgs.length; i++) {
                const org = orgs[i];
                if (org === undefined) {
                    continue;
                }
                if (resumeOrgId !== undefined && org.id !== resumeOrgId) {
                    continue;
                }
                if (resumeOrgId !== undefined && org.id === resumeOrgId) {
                    resumeOrgId = undefined;
                }

                let clientCursor = org.id === state.orgId ? resumeClientCursor : undefined;

                while (true) {
                    const clientsProxyConfig: ProxyConfiguration = {
                        // https://developer.hubstaff.com/
                        endpoint: `v2/organizations/${encodeURIComponent(String(org.id))}/clients`,
                        params: {
                            page_limit: 100,
                            ...(clientCursor !== undefined && { page_start_id: clientCursor })
                        },
                        retries: 3
                    };

                    const clientsResponse = await nango.proxy(clientsProxyConfig);
                    const parsedClients = ClientListSchema.safeParse(clientsResponse.data);
                    if (!parsedClients.success) {
                        throw new Error('Failed to parse clients: ' + parsedClients.error.message);
                    }

                    const clients = parsedClients.data.clients;
                    const rawNextClientCursor = parsedClients.data.pagination?.next_page_start_id;
                    const nextClientCursor = rawNextClientCursor != null ? String(rawNextClientCursor) : undefined;

                    const mapped = clients
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

                    if (mapped.length > 0) {
                        await nango.batchSave(mapped, 'Client');
                    }

                    if (nextClientCursor !== undefined) {
                        await nango.saveCheckpoint({
                            state_json: JSON.stringify({
                                ...(orgCursor !== undefined && { orgCursor }),
                                orgId: org.id,
                                clientCursor: nextClientCursor
                            })
                        });
                        clientCursor = nextClientCursor;
                        continue;
                    }

                    const nextOrg = orgs[i + 1];
                    if (nextOrg !== undefined) {
                        await nango.saveCheckpoint({
                            state_json: JSON.stringify({
                                ...(orgCursor !== undefined && { orgCursor }),
                                orgId: nextOrg.id
                            })
                        });
                    } else if (nextOrgCursor !== undefined) {
                        await nango.saveCheckpoint({
                            state_json: JSON.stringify({
                                orgCursor: nextOrgCursor
                            })
                        });
                    }

                    break;
                }
            }

            if (nextOrgCursor !== undefined) {
                await nango.saveCheckpoint({
                    state_json: JSON.stringify({
                        orgCursor: nextOrgCursor
                    })
                });
                orgCursor = nextOrgCursor;
                resumeOrgId = undefined;
                resumeClientCursor = undefined;
                continue;
            }

            break;
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Client');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
