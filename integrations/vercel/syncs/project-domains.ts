import { createSync, type ProxyConfiguration } from 'nango';
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

// `pagination` and `pagination.next` are required (next is nullable, not optional): Vercel
// signals "no more pages" via `next: null`, not by omitting the field or the whole object.
// If a response is missing pagination info entirely, parsing must fail loudly instead of
// silently being treated as the last page, which would close out trackDeletesEnd() based on
// an incomplete crawl.
const ProjectsListResponseSchema = z.object({
    projects: z.array(ProjectSchema),
    pagination: z.object({
        next: z.number().nullable()
    })
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
    pagination: z.object({
        next: z.number().nullable()
    })
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

        const proxyConfig: ProxyConfiguration = {
            // https://vercel.com/docs/rest-api/reference/endpoints/projects#retrieve-a-list-of-projects
            endpoint: '/v9/projects',
            params: {
                limit: 100,
                ...(projectsUntil !== undefined && { until: projectsUntil })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'until',
                cursor_path_in_response: 'pagination.next',
                response_path: 'projects',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam, response }) => {
                    // Validate the full raw outer response (not just the extracted `projects`
                    // page) so a malformed/truncated response missing `pagination` throws
                    // instead of silently being treated as "no more pages".
                    const parsedPage = ProjectsListResponseSchema.safeParse(response.data);
                    if (!parsedPage.success) {
                        throw new Error(`Invalid projects response: ${parsedPage.error.message}`);
                    }
                    projectsUntil = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsedProjects = z.array(ProjectSchema).safeParse(page);
            if (!parsedProjects.success) {
                throw new Error(`Invalid projects response: ${parsedProjects.error.message}`);
            }

            const resumeIndex = resumeProjectId != null ? parsedProjects.data.findIndex((project) => project.id === resumeProjectId) : 0;
            const pageProjects = resumeIndex >= 0 ? parsedProjects.data.slice(resumeIndex) : parsedProjects.data;

            for (const [index, project] of pageProjects.entries()) {
                let projectDomainsUntil = resumeProjectId === project.id ? resumeProjectDomainsUntil : undefined;

                await saveCheckpoint(projectsUntil, project.id, projectDomainsUntil);

                // The inner per-project domains pagination is kept as a manual loop rather
                // than nango.paginate(): on_page only reports the cursor for the outer page
                // it just fetched (one page behind what's being consumed), so it cannot look
                // ahead, from inside a specific project's processing, to know the outer
                // cursor for the page after the current one. A manual loop keeps this
                // project's own cursor-resume state exact and simple to reason about.
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

                    const nextProjectDomainsUntil = parsedDomains.data.pagination.next ?? undefined;
                    if (nextProjectDomainsUntil === undefined) {
                        break;
                    }

                    projectDomainsUntil = nextProjectDomainsUntil;
                    await saveCheckpoint(projectsUntil, project.id, projectDomainsUntil);
                }

                const nextProject = pageProjects[index + 1];
                if (nextProject) {
                    await saveCheckpoint(projectsUntil, nextProject.id, undefined);
                }
                // If this was the last project in the current outer page, leave the
                // checkpoint as-is (pointing at this outer page's cursor and this
                // project's id). A resumed run would re-fetch this same outer page,
                // locate this project again via resumeProjectId, and reprocess just its
                // domains once more (safe: batchSave upserts by id) before continuing to
                // the next outer page. nango.paginate() tracks the outer cursor's actual
                // advancement internally, so no separate "jump to next outer page"
                // checkpoint is needed here for correctness.

                resumeProjectId = undefined;
                resumeProjectDomainsUntil = undefined;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ProjectDomain');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
