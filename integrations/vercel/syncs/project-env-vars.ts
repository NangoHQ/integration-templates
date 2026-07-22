import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const NO_CURSOR = -1;
const NO_PROJECT_ID = '';

const ProjectSchema = z.object({
    id: z.string()
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

const EnvVarSchema = z.object({
    id: z.string(),
    key: z.string(),
    type: z.string().optional(),
    target: z.union([z.string(), z.array(z.string())]).optional(),
    value: z.string().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    gitBranch: z.string().optional(),
    sensitive: z.boolean().optional(),
    system: z.boolean().optional(),
    comment: z.string().optional()
});

// Unlike the top-level list endpoints (`/v9/projects`, etc.), Vercel's documented response for
// `GET /v10/projects/{id}/env` is a `oneOf`: either `{envs, pagination}` when the endpoint paginates,
// or `{envs, hiddenProductionEnvCount}` with no `pagination` at all when it doesn't (confirmed live -
// this project's env list returns the latter). So `pagination` can't be required here.
const ProjectEnvVarsListResponseSchema = z.object({
    envs: z.array(EnvVarSchema),
    pagination: z
        .object({
            next: z.number().nullable()
        })
        .optional()
});

const ProjectEnvVarSchema = z.object({
    id: z.string(),
    projectId: z.string(),
    envVarId: z.string(),
    key: z.string(),
    type: z.string().optional(),
    target: z.union([z.string(), z.array(z.string())]).optional(),
    value: z.string().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    gitBranch: z.string().optional(),
    sensitive: z.boolean().optional(),
    system: z.boolean().optional(),
    comment: z.string().optional()
});

const CheckpointSchema = z.object({
    projectsUntil: z.number(),
    projectId: z.string(),
    projectEnvVarsUntil: z.number()
});

const sync = createSync({
    description: 'Sync project env vars.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ProjectEnvVar: ProjectEnvVarSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let projectsUntil = checkpoint && checkpoint.projectsUntil !== NO_CURSOR ? checkpoint.projectsUntil : undefined;
        let resumeProjectId = checkpoint?.projectId || undefined;
        let resumeProjectEnvVarsUntil = checkpoint && checkpoint.projectEnvVarsUntil !== NO_CURSOR ? checkpoint.projectEnvVarsUntil : undefined;

        const saveCheckpoint = async (projectsUntil: number | undefined, projectId: string | undefined, projectEnvVarsUntil: number | undefined) => {
            await nango.saveCheckpoint({
                projectsUntil: projectsUntil ?? NO_CURSOR,
                projectId: projectId ?? NO_PROJECT_ID,
                projectEnvVarsUntil: projectEnvVarsUntil ?? NO_CURSOR
            });
        };

        // Blocker: /v10/projects/{id}/env exposes cursor pagination only. The list
        // endpoint is still a full snapshot per project, so use delete tracking for
        // the full crawl and save cursors only to resume interrupted runs.
        await nango.trackDeletesStart('ProjectEnvVar');

        const proxyConfig: ProxyConfiguration = {
            // https://vercel.com/docs/rest-api/reference#endpoints.projects.list-all-projects
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
                        throw new Error(`Failed to parse projects response: ${parsedPage.error.message}`);
                    }
                    projectsUntil = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsedProjects = z.array(ProjectSchema).safeParse(page);
            if (!parsedProjects.success) {
                throw new Error(`Failed to parse projects response: ${parsedProjects.error.message}`);
            }

            const resumeIndex = resumeProjectId != null ? parsedProjects.data.findIndex((project) => project.id === resumeProjectId) : 0;
            const pageProjects = resumeIndex >= 0 ? parsedProjects.data.slice(resumeIndex) : parsedProjects.data;

            for (const [index, project] of pageProjects.entries()) {
                let projectEnvVarsUntil = resumeProjectId === project.id ? resumeProjectEnvVarsUntil : undefined;

                await saveCheckpoint(projectsUntil, project.id, projectEnvVarsUntil);

                // The inner per-project env-var pagination is kept as a manual loop rather
                // than nango.paginate(): on_page only reports the cursor for the outer page
                // it just fetched (one page behind what's being consumed), so it cannot look
                // ahead, from inside a specific project's processing, to know the outer
                // cursor for the page after the current one. A manual loop keeps this
                // project's own cursor-resume state exact and simple to reason about.
                while (true) {
                    // https://vercel.com/docs/rest-api/reference#endpoints.projects.get-project-environment-variables
                    const envVarsResponse = await nango.get({
                        endpoint: `/v10/projects/${encodeURIComponent(project.id)}/env`,
                        params: {
                            limit: 100,
                            ...(projectEnvVarsUntil !== undefined && { until: projectEnvVarsUntil })
                        },
                        retries: 3
                    });

                    const parsedEnvVars = ProjectEnvVarsListResponseSchema.safeParse(envVarsResponse.data);
                    if (!parsedEnvVars.success) {
                        throw new Error(`Failed to parse env vars response for project ${project.id}: ${parsedEnvVars.error.message}`);
                    }

                    const records = parsedEnvVars.data.envs.map((envVar) => ({
                        id: `${project.id}:${envVar.id}`,
                        projectId: project.id,
                        envVarId: envVar.id,
                        key: envVar.key,
                        ...(envVar.type !== undefined && { type: envVar.type }),
                        ...(envVar.target !== undefined && { target: envVar.target }),
                        ...(envVar.value !== undefined && { value: envVar.value }),
                        ...(envVar.createdAt !== undefined && { createdAt: envVar.createdAt }),
                        ...(envVar.updatedAt !== undefined && { updatedAt: envVar.updatedAt }),
                        ...(envVar.gitBranch !== undefined && { gitBranch: envVar.gitBranch }),
                        ...(envVar.sensitive !== undefined && { sensitive: envVar.sensitive }),
                        ...(envVar.system !== undefined && { system: envVar.system }),
                        ...(envVar.comment !== undefined && { comment: envVar.comment })
                    }));

                    if (records.length > 0) {
                        await nango.batchSave(records, 'ProjectEnvVar');
                    }

                    const nextProjectEnvVarsUntil = parsedEnvVars.data.pagination?.next ?? undefined;
                    if (nextProjectEnvVarsUntil === undefined) {
                        break;
                    }

                    projectEnvVarsUntil = nextProjectEnvVarsUntil;
                    await saveCheckpoint(projectsUntil, project.id, projectEnvVarsUntil);
                }

                const nextProject = pageProjects[index + 1];
                if (nextProject) {
                    await saveCheckpoint(projectsUntil, nextProject.id, undefined);
                }
                // If this was the last project in the current outer page, leave the
                // checkpoint as-is (pointing at this outer page's cursor and this
                // project's id). A resumed run would re-fetch this same outer page,
                // locate this project again via resumeProjectId, and reprocess just its
                // env vars once more (safe: batchSave upserts by id) before continuing to
                // the next outer page. nango.paginate() tracks the outer cursor's actual
                // advancement internally, so no separate "jump to next outer page"
                // checkpoint is needed here for correctness.

                resumeProjectId = undefined;
                resumeProjectEnvVarsUntil = undefined;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ProjectEnvVar');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
