import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    workspace_ids: z.array(z.string()).optional(),
    team_ids: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    scope_index: z.number().int().nonnegative()
});

const AsanaProjectSchema = z.object({
    gid: z.string(),
    name: z.string(),
    archived: z.boolean().optional(),
    color: z.string().nullish(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    notes: z.string().nullish(),
    public: z.boolean().optional(),
    permalink_url: z.string().optional(),
    completed: z.boolean().optional(),
    completed_at: z.string().nullish(),
    due_on: z.string().nullish(),
    start_on: z.string().nullish(),
    workspace: z
        .object({
            gid: z.string(),
            name: z.string()
        })
        .optional(),
    team: z
        .object({
            gid: z.string(),
            name: z.string()
        })
        .optional()
        .nullable(),
    owner: z
        .object({
            gid: z.string(),
            name: z.string()
        })
        .optional()
        .nullable()
});

const ProjectSchema = z.object({
    id: z.string(),
    gid: z.string(),
    name: z.string(),
    archived: z.boolean().optional(),
    color: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    notes: z.string().optional(),
    public: z.boolean().optional(),
    permalink_url: z.string().optional(),
    completed: z.boolean().optional(),
    completed_at: z.string().optional(),
    due_on: z.string().optional(),
    start_on: z.string().optional(),
    workspace: z
        .object({
            gid: z.string(),
            name: z.string()
        })
        .optional(),
    team: z
        .object({
            gid: z.string(),
            name: z.string()
        })
        .optional(),
    owner: z
        .object({
            gid: z.string(),
            name: z.string()
        })
        .optional()
});

type AsanaProject = z.infer<typeof AsanaProjectSchema>;

const sync = createSync({
    description: 'Sync projects for workspaces or teams in scope.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Project: ProjectSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/projects'
        }
    ],

    exec: async (nango) => {
        let rawMetadata: unknown;
        try {
            rawMetadata = await nango.getMetadata();
        } catch (error) {
            if (!(error instanceof Error) || error.message !== 'Missing mock data for getMetadata') {
                throw error;
            }
        }

        const metadata = rawMetadata != null ? MetadataSchema.parse(rawMetadata) : null;
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = rawCheckpoint != null ? CheckpointSchema.safeParse(rawCheckpoint) : null;
        const hasResumeCheckpoint = parsedCheckpoint?.success ?? false;
        const startIndex = parsedCheckpoint?.success ? parsedCheckpoint.data.scope_index : 0;

        const workspaceIds = metadata?.workspace_ids ?? [];
        const teamIds = metadata?.team_ids ?? [];

        if (workspaceIds.length === 0 && teamIds.length === 0) {
            // https://developers.asana.com/reference/getworkspaces
            for await (const batch of nango.paginate({
                endpoint: '/api/1.0/workspaces',
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'offset',
                    cursor_path_in_response: 'next_page.offset',
                    response_path: 'data',
                    limit_name_in_request: 'limit',
                    limit: 100
                },
                retries: 3
            })) {
                const parsedWorkspaces = z.array(z.object({ gid: z.string() })).safeParse(batch);
                if (parsedWorkspaces.success) {
                    workspaceIds.push(...parsedWorkspaces.data.map((w) => w.gid));
                }
            }
        }

        if (workspaceIds.length === 0 && teamIds.length === 0) {
            await nango.log('No workspaces or teams found for this connection');
            return;
        }

        // Blocker: the workspace and team project list endpoints do not support a
        // modified_since filter, so we use a scope checkpoint only to resume a
        // full refresh across workspace and team scopes.
        if (!hasResumeCheckpoint) {
            await nango.trackDeletesStart('Project');
        }

        const optFields =
            'gid,name,archived,color,created_at,modified_at,notes,public,permalink_url,completed,completed_at,due_on,start_on,workspace,team,owner';

        const scopes = [
            ...workspaceIds.map((workspaceId) => ({ endpoint: `/api/1.0/workspaces/${workspaceId}/projects` })),
            ...teamIds.map((teamId) => ({ endpoint: `/api/1.0/teams/${teamId}/projects` }))
        ];

        const processProjects = async (endpoint: string) => {
            // https://developers.asana.com/reference/getprojectsforworkspace
            // https://developers.asana.com/reference/getprojectsforteam
            const config = {
                endpoint,
                params: {
                    limit: 100,
                    opt_fields: optFields
                },
                paginate: {
                    limit: 100
                },
                retries: 3
            };

            for await (const page of nango.paginate(config)) {
                const projects: AsanaProject[] = [];
                for (const item of page) {
                    const parsed = AsanaProjectSchema.safeParse(item);
                    if (parsed.success) {
                        projects.push(parsed.data);
                    }
                }

                const toSave = projects.map((project) => ({
                    id: project.gid,
                    gid: project.gid,
                    name: project.name,
                    ...(project.archived !== undefined && { archived: project.archived }),
                    ...(project.color != null && { color: project.color }),
                    ...(project.created_at !== undefined && { created_at: project.created_at }),
                    ...(project.modified_at !== undefined && { modified_at: project.modified_at }),
                    ...(project.notes != null && { notes: project.notes }),
                    ...(project.public !== undefined && { public: project.public }),
                    ...(project.permalink_url !== undefined && { permalink_url: project.permalink_url }),
                    ...(project.completed !== undefined && { completed: project.completed }),
                    ...(project.completed_at != null && { completed_at: project.completed_at }),
                    ...(project.due_on != null && { due_on: project.due_on }),
                    ...(project.start_on != null && { start_on: project.start_on }),
                    ...(project.workspace !== undefined && { workspace: project.workspace }),
                    ...(project.team != null && { team: project.team }),
                    ...(project.owner != null && { owner: project.owner })
                }));

                if (toSave.length > 0) {
                    await nango.batchSave(toSave, 'Project');
                }
            }
        };

        for (let i = startIndex; i < scopes.length; i++) {
            const scope = scopes[i];
            if (!scope) {
                continue;
            }

            await processProjects(scope.endpoint);
            await nango.saveCheckpoint({ scope_index: i + 1 });
        }

        await nango.trackDeletesEnd('Project');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
