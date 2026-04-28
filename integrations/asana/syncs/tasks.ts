import { createSync } from 'nango';
import { z } from 'zod';

const AsanaWorkspaceSchema = z.object({
    gid: z.string(),
    name: z.string().nullable().optional(),
    resource_type: z.string().optional()
});

const AsanaProjectSchema = z.object({
    gid: z.string(),
    name: z.string().nullable().optional(),
    resource_type: z.string().optional()
});

const AsanaTaskSchema = z.object({
    gid: z.string(),
    name: z.string().nullable().optional(),
    resource_type: z.string().optional(),
    resource_subtype: z.string().optional(),
    modified_at: z.string(),
    created_at: z.string().optional(),
    completed: z.boolean().optional(),
    assignee: z
        .object({
            gid: z.string().optional(),
            name: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    due_on: z.string().nullable().optional(),
    due_at: z.string().nullable().optional(),
    workspace: z
        .object({
            gid: z.string().optional(),
            name: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    projects: z
        .array(
            z.object({
                gid: z.string().optional(),
                name: z.string().nullable().optional()
            })
        )
        .nullable()
        .optional()
});

const TaskSchema = z.object({
    id: z.string(),
    gid: z.string(),
    name: z.string().optional(),
    resource_type: z.string().optional(),
    resource_subtype: z.string().optional(),
    modified_at: z.string(),
    created_at: z.string().optional(),
    completed: z.boolean().optional(),
    assignee_gid: z.string().optional(),
    assignee_name: z.string().optional(),
    due_on: z.string().optional(),
    due_at: z.string().optional(),
    workspace_gid: z.string().optional(),
    workspace_name: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    scope_index: z.number().int().nonnegative(),
    max_modified_at: z.string()
});

const LoadedCheckpointSchema = z.object({
    updated_after: z.string().optional(),
    scope_index: z.number().int().nonnegative().optional(),
    max_modified_at: z.string().optional()
});

const MetadataSchema = z.object({
    workspace_id: z.string().optional(),
    project_id: z.string().optional(),
    section_id: z.string().optional()
});

type TaskScope =
    | {
          kind: 'project';
          id: string;
      }
    | {
          kind: 'section';
          id: string;
      };

function mapTask(raw: z.infer<typeof AsanaTaskSchema>): z.infer<typeof TaskSchema> {
    return {
        id: raw.gid,
        gid: raw.gid,
        name: raw.name ?? undefined,
        resource_type: raw.resource_type,
        resource_subtype: raw.resource_subtype,
        modified_at: raw.modified_at,
        created_at: raw.created_at,
        completed: raw.completed,
        assignee_gid: raw.assignee?.gid,
        assignee_name: raw.assignee?.name ?? undefined,
        due_on: raw.due_on ?? undefined,
        due_at: raw.due_at ?? undefined,
        workspace_gid: raw.workspace?.gid,
        workspace_name: raw.workspace?.name ?? undefined
    };
}

const sync = createSync({
    description: 'Sync tasks for projects, sections, or workspace search scopes.',
    version: '3.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/tasks' }],
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    models: {
        Task: TaskSchema
    },

    exec: async (nango) => {
        const checkpointResult = LoadedCheckpointSchema.safeParse(await nango.getCheckpoint());
        const checkpoint = checkpointResult.success ? checkpointResult.data : {};
        let metadataRaw: unknown;
        try {
            metadataRaw = await nango.getMetadata();
        } catch (error) {
            if (!(error instanceof Error) || error.message !== 'Missing mock data for getMetadata') {
                throw error;
            }
        }

        const metadata = MetadataSchema.safeParse(metadataRaw).data ?? {};
        const scopes = await getTaskScopes(nango, metadata);

        if (scopes.length === 0) {
            await nango.log('No projects or sections found to sync tasks');
            return;
        }

        const baseUpdatedAfter = checkpoint.updated_after;
        const startIndex = checkpoint.scope_index ?? 0;
        let maxModifiedAt = checkpoint.max_modified_at ?? checkpoint.updated_after;

        for (let i = startIndex; i < scopes.length; i++) {
            const scope = scopes[i];
            if (!scope) {
                continue;
            }

            const scopeMaxModifiedAt = await fetchAndSaveTasksForScope(nango, scope, baseUpdatedAfter);
            maxModifiedAt = getLaterTimestamp(maxModifiedAt, scopeMaxModifiedAt);

            if (i < scopes.length - 1) {
                await nango.saveCheckpoint({
                    updated_after: baseUpdatedAfter ?? '',
                    scope_index: i + 1,
                    max_modified_at: maxModifiedAt ?? ''
                });
            }
        }

        const nextUpdatedAfter = maxModifiedAt ?? baseUpdatedAfter;
        if (nextUpdatedAfter) {
            await nango.saveCheckpoint({
                updated_after: nextUpdatedAfter,
                scope_index: 0,
                max_modified_at: nextUpdatedAfter
            });
        } else {
            await nango.clearCheckpoint();
        }
    }
});

function getLaterTimestamp(current: string | undefined, candidate: string | undefined): string | undefined {
    if (!current) {
        return candidate;
    }

    if (!candidate) {
        return current;
    }

    return candidate > current ? candidate : current;
}

async function getFirstWorkspace(nango: NangoSyncLocal): Promise<string | undefined> {
    // https://developers.asana.com/reference/getworkspaces
    const response = await nango.get({
        endpoint: '/api/1.0/workspaces',
        params: {
            opt_fields: 'gid,name'
        },
        retries: 3
    });

    const workspaces = z.array(AsanaWorkspaceSchema).safeParse(response.data?.data).data ?? [];
    return workspaces[0]?.gid;
}

async function getProjectsForWorkspace(nango: NangoSyncLocal, workspaceId: string): Promise<z.infer<typeof AsanaProjectSchema>[]> {
    const projects: z.infer<typeof AsanaProjectSchema>[] = [];
    const proxyConfig = {
        // https://developers.asana.com/reference/getprojectsforworkspace
        endpoint: `/api/1.0/workspaces/${workspaceId}/projects`,
        params: {
            opt_fields: 'gid,name',
            limit: 100
        },
        paginate: {
            limit: 100
        },
        retries: 3
    };

    for await (const batch of nango.paginate(proxyConfig)) {
        if (!Array.isArray(batch)) {
            continue;
        }
        for (const raw of batch) {
            const parsed = AsanaProjectSchema.safeParse(raw);
            if (parsed.success) {
                projects.push(parsed.data);
            }
        }
    }

    return projects;
}

async function getTaskScopes(nango: NangoSyncLocal, metadata: z.infer<typeof MetadataSchema>): Promise<TaskScope[]> {
    if (metadata.project_id) {
        return [{ kind: 'project', id: metadata.project_id }];
    }

    if (metadata.section_id) {
        return [{ kind: 'section', id: metadata.section_id }];
    }

    const workspaceId = metadata.workspace_id ?? (await getFirstWorkspace(nango));
    if (!workspaceId) {
        return [];
    }

    const projects = await getProjectsForWorkspace(nango, workspaceId);
    return projects.map((project) => ({ kind: 'project', id: project.gid }));
}

async function fetchAndSaveTasksForScope(nango: NangoSyncLocal, scope: TaskScope, updatedAfter?: string): Promise<string | undefined> {
    const proxyConfig = {
        // https://developers.asana.com/reference/gettasks
        endpoint: '/api/1.0/tasks',
        params: {
            ...(scope.kind === 'project' ? { project: scope.id } : { section: scope.id }),
            opt_fields: 'gid,name,resource_type,resource_subtype,modified_at,created_at,completed,assignee,due_on,due_at,workspace',
            limit: 100,
            ...(updatedAfter && { modified_since: updatedAfter })
        },
        paginate: {
            limit: 100
        },
        retries: 3
    };

    let maxModifiedAt: string | undefined;

    for await (const batch of nango.paginate(proxyConfig)) {
        if (!Array.isArray(batch)) {
            continue;
        }

        const tasks: z.infer<typeof TaskSchema>[] = [];
        for (const raw of batch) {
            const parsed = AsanaTaskSchema.safeParse(raw);
            if (parsed.success) {
                tasks.push(mapTask(parsed.data));
                maxModifiedAt = getLaterTimestamp(maxModifiedAt, parsed.data.modified_at);
            }
        }

        if (tasks.length > 0) {
            await nango.batchSave(tasks, 'Task');
        }
    }

    return maxModifiedAt;
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
