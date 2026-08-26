import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OrganizationSchema = z.object({
    id: z.number()
});

const ProviderProjectSchema = z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string(),
    status: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    organization_id: z.number(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const sync = createSync({
    description: 'Sync projects across all organizations this connection can access.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Project: ProjectSchema
    },

    exec: async (nango) => {
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
                const parsedOrg = OrganizationSchema.safeParse(rawOrg);
                if (!parsedOrg.success) {
                    throw new Error(`Failed to parse organization: ${parsedOrg.error.message}`);
                }
                orgIds.push(parsedOrg.data.id);
            }
        }

        await nango.trackDeletesStart('Project');

        for (const orgId of orgIds) {
            const projectsProxyConfig: ProxyConfiguration = {
                // https://developer.hubstaff.com/
                endpoint: `v2/organizations/${encodeURIComponent(String(orgId))}/projects`,
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'page_start_id',
                    cursor_path_in_response: 'pagination.next_page_start_id',
                    response_path: 'projects',
                    limit_name_in_request: 'page_limit',
                    limit: 100
                },
                retries: 3
            };

            for await (const projectsPage of nango.paginate(projectsProxyConfig)) {
                const projects: z.infer<typeof ProjectSchema>[] = [];

                for (const raw of projectsPage) {
                    const parsed = ProviderProjectSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse project: ${parsed.error.message}`);
                    }

                    projects.push({
                        id: String(parsed.data.id),
                        name: parsed.data.name,
                        status: parsed.data.status,
                        organization_id: orgId,
                        ...(parsed.data.created_at && { created_at: parsed.data.created_at }),
                        ...(parsed.data.updated_at && { updated_at: parsed.data.updated_at })
                    });
                }

                if (projects.length > 0) {
                    await nango.batchSave(projects, 'Project');
                }
            }
        }

        await nango.trackDeletesEnd('Project');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
