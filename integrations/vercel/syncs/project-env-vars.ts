import { createSync } from 'nango';
import { z } from 'zod';

const NO_CURSOR = -1;
const NO_PROJECT_ID = '';

const ProjectSchema = z.object({
    id: z.string()
});

const ProjectsListResponseSchema = z.object({
    projects: z.array(ProjectSchema),
    pagination: z
        .object({
            next: z.number().nullable().optional()
        })
        .optional()
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

const ProjectEnvVarsListResponseSchema = z.object({
    envs: z.array(EnvVarSchema),
    pagination: z
        .object({
            next: z.number().nullable().optional()
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

        while (true) {
            // https://vercel.com/docs/rest-api/reference#endpoints.projects.list-all-projects
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
                throw new Error(`Failed to parse projects response: ${parsedProjects.error.message}`);
            }

            const nextProjectsUntil = parsedProjects.data.pagination?.next ?? undefined;
            const resumeIndex = resumeProjectId != null ? parsedProjects.data.projects.findIndex((project) => project.id === resumeProjectId) : 0;
            const pageProjects = resumeIndex >= 0 ? parsedProjects.data.projects.slice(resumeIndex) : parsedProjects.data.projects;

            for (const [index, project] of pageProjects.entries()) {
                let projectEnvVarsUntil = resumeProjectId === project.id ? resumeProjectEnvVarsUntil : undefined;

                await saveCheckpoint(projectsUntil, project.id, projectEnvVarsUntil);

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
                } else if (nextProjectsUntil !== undefined) {
                    await saveCheckpoint(nextProjectsUntil, undefined, undefined);
                }

                resumeProjectId = undefined;
                resumeProjectEnvVarsUntil = undefined;
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
        await nango.trackDeletesEnd('ProjectEnvVar');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
