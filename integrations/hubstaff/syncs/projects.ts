import { createSync } from 'nango';
import { z } from 'zod';

const ProviderOrganizationSchema = z.object({
    id: z.union([z.string(), z.number()])
});

const OrganizationsResponseSchema = z.object({
    organizations: z.array(z.unknown())
});

const ProviderProjectSchema = z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string(),
    status: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProjectsResponseSchema = z.object({
    projects: z.array(z.unknown())
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
        // https://developer.hubstaff.com/
        const orgsResponse = await nango.get({
            endpoint: 'v2/organizations',
            retries: 3
        });

        const parsedOrgs = OrganizationsResponseSchema.safeParse(orgsResponse.data);
        if (!parsedOrgs.success) {
            throw new Error(`Failed to parse organizations response: ${parsedOrgs.error.message}`);
        }

        const orgIds: number[] = [];
        for (const rawOrg of parsedOrgs.data.organizations) {
            const parsedOrg = ProviderOrganizationSchema.safeParse(rawOrg);
            if (!parsedOrg.success) {
                throw new Error(`Failed to parse organization: ${parsedOrg.error.message}`);
            }
            orgIds.push(Number(parsedOrg.data.id));
        }

        await nango.trackDeletesStart('Project');

        for (const orgId of orgIds) {
            // https://developer.hubstaff.com/
            const projectsResponse = await nango.get({
                endpoint: `v2/organizations/${encodeURIComponent(String(orgId))}/projects`,
                retries: 3
            });

            const parsedProjects = ProjectsResponseSchema.safeParse(projectsResponse.data);
            if (!parsedProjects.success) {
                throw new Error(`Failed to parse projects response: ${parsedProjects.error.message}`);
            }

            const projects: z.infer<typeof ProjectSchema>[] = [];

            for (const raw of parsedProjects.data.projects) {
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

        await nango.trackDeletesEnd('Project');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
