import { createSync } from 'nango';
import { z } from 'zod';

const NO_CURSOR = -1;
const NO_PROJECT_ID = '';

const CheckpointSchema = z.object({
    projectsUntil: z.number(),
    projectId: z.string(),
    projectDomainsUntil: z.number()
});

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProjectsListResponseSchema = z.object({
    projects: z.array(ProjectSchema),
    pagination: z
        .object({
            next: z.number().nullable().optional()
        })
        .optional()
});

const DomainSchema = z.object({
    name: z.string(),
    apexName: z.string(),
    projectId: z.string(),
    verified: z.boolean(),
    redirect: z.string().nullish(),
    redirectStatusCode: z.number().nullish(),
    gitBranch: z.string().nullish(),
    customEnvironmentId: z.string().nullish(),
    updatedAt: z.number().optional(),
    createdAt: z.number().optional()
});

const ProjectDomainsListResponseSchema = z.object({
    domains: z.array(DomainSchema),
    pagination: z
        .object({
            next: z.number().nullable().optional()
        })
        .optional()
});

const ProjectDomainSchema = z.object({
    id: z.string(),
    name: z.string(),
    apexName: z.string(),
    projectId: z.string(),
    verified: z.boolean(),
    redirect: z.string().optional(),
    redirectStatusCode: z.number().optional(),
    gitBranch: z.string().optional(),
    customEnvironmentId: z.string().optional(),
    updatedAt: z.number().optional(),
    createdAt: z.number().optional()
});

const sync = createSync({
    description: 'Sync domains assigned per project.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ProjectDomain: ProjectDomainSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let projectsUntil = checkpoint && checkpoint.projectsUntil !== NO_CURSOR ? checkpoint.projectsUntil : undefined;
        let resumeProjectId = checkpoint?.projectId || undefined;
        let resumeProjectDomainsUntil = checkpoint && checkpoint.projectDomainsUntil !== NO_CURSOR ? checkpoint.projectDomainsUntil : undefined;

        const saveCheckpoint = async (projectsUntil: number | undefined, projectId: string | undefined, projectDomainsUntil: number | undefined) => {
            await nango.saveCheckpoint({
                projectsUntil: projectsUntil ?? NO_CURSOR,
                projectId: projectId ?? NO_PROJECT_ID,
                projectDomainsUntil: projectDomainsUntil ?? NO_CURSOR
            });
        };

        // Blocker: /v9/projects/{id}/domains has no changed-since filter. Keep this as
        // a full crawl with delete tracking, and use cursor checkpoints only to resume
        // a partially completed projects walk and per-project domains pagination.
        await nango.trackDeletesStart('ProjectDomain');

        while (true) {
            // https://vercel.com/docs/rest-api/reference/endpoints/projects#retrieve-a-list-of-projects
            const projectsResponse = await nango.get({
                endpoint: '/v9/projects',
                params: {
                    limit: 100,
                    ...(projectsUntil !== undefined && { until: projectsUntil })
                },
                retries: 3
            });

            const parsedProjects = ProjectsListResponseSchema.safeParse(projectsResponse.data);
            if (!parsedProjects.success) {
                throw new Error(`Invalid projects response: ${parsedProjects.error.message}`);
            }

            const nextProjectsUntil = parsedProjects.data.pagination?.next ?? undefined;
            const resumeIndex = resumeProjectId != null ? parsedProjects.data.projects.findIndex((project) => project.id === resumeProjectId) : 0;
            const pageProjects = resumeIndex >= 0 ? parsedProjects.data.projects.slice(resumeIndex) : parsedProjects.data.projects;

            for (const [index, project] of pageProjects.entries()) {
                let projectDomainsUntil = resumeProjectId === project.id ? resumeProjectDomainsUntil : undefined;

                await saveCheckpoint(projectsUntil, project.id, projectDomainsUntil);

                while (true) {
                    // https://vercel.com/docs/rest-api/reference/endpoints/projects#retrieve-project-domains-by-project-by-id-or-name
                    const domainsResponse = await nango.get({
                        endpoint: `/v9/projects/${encodeURIComponent(project.id)}/domains`,
                        params: {
                            limit: 100,
                            ...(projectDomainsUntil !== undefined && { until: projectDomainsUntil })
                        },
                        retries: 3
                    });

                    const parsedDomains = ProjectDomainsListResponseSchema.safeParse(domainsResponse.data);
                    if (!parsedDomains.success) {
                        throw new Error(`Invalid domains response for project ${project.id}: ${parsedDomains.error.message}`);
                    }

                    const domains = parsedDomains.data.domains.map((domain) => ({
                        id: `${domain.projectId}:${domain.name}`,
                        name: domain.name,
                        apexName: domain.apexName,
                        projectId: domain.projectId,
                        verified: domain.verified,
                        ...(domain.redirect != null && { redirect: domain.redirect }),
                        ...(domain.redirectStatusCode != null && { redirectStatusCode: domain.redirectStatusCode }),
                        ...(domain.gitBranch != null && { gitBranch: domain.gitBranch }),
                        ...(domain.customEnvironmentId != null && { customEnvironmentId: domain.customEnvironmentId }),
                        ...(domain.updatedAt != null && { updatedAt: domain.updatedAt }),
                        ...(domain.createdAt != null && { createdAt: domain.createdAt })
                    }));

                    if (domains.length > 0) {
                        await nango.batchSave(domains, 'ProjectDomain');
                    }

                    const nextProjectDomainsUntil = parsedDomains.data.pagination?.next ?? undefined;
                    if (nextProjectDomainsUntil === undefined) {
                        break;
                    }

                    projectDomainsUntil = nextProjectDomainsUntil;
                    await saveCheckpoint(projectsUntil, project.id, projectDomainsUntil);
                }

                const nextProject = pageProjects[index + 1];
                if (nextProject) {
                    await saveCheckpoint(projectsUntil, nextProject.id, undefined);
                } else if (nextProjectsUntil !== undefined) {
                    await saveCheckpoint(nextProjectsUntil, undefined, undefined);
                }

                resumeProjectId = undefined;
                resumeProjectDomainsUntil = undefined;
            }

            if (pageProjects.length === 0 && nextProjectsUntil !== undefined) {
                await saveCheckpoint(nextProjectsUntil, undefined, undefined);
            }

            if (nextProjectsUntil === undefined) {
                break;
            }

            projectsUntil = nextProjectsUntil;
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ProjectDomain');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
