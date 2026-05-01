import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_gid: z.string().describe('The task to operate on. Example: "1200000000000001"'),
    cursor: z.string().optional().describe('Pagination cursor (offset token) from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Results per page, between 1 and 100.')
});

const UserSchema = z.object({
    gid: z.string(),
    name: z.string().optional(),
    resource_type: z.string().optional()
});

const ProjectSchema = z.object({
    gid: z.string(),
    name: z.string().optional(),
    resource_type: z.string().optional()
});

const TagSchema = z.object({
    gid: z.string(),
    name: z.string().optional(),
    resource_type: z.string().optional()
});

const WorkspaceSchema = z.object({
    gid: z.string(),
    name: z.string().optional(),
    resource_type: z.string().optional()
});

const ParentSchema = z.object({
    gid: z.string(),
    name: z.string().optional(),
    resource_type: z.string().optional()
});

const ProviderTaskSchema = z.object({
    gid: z.string(),
    name: z.string().optional(),
    resource_type: z.string().optional(),
    assignee: UserSchema.nullable().optional(),
    completed: z.boolean().optional(),
    due_on: z.string().nullable().optional(),
    notes: z.string().optional(),
    parent: ParentSchema.nullable().optional(),
    permalink_url: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    workspace: WorkspaceSchema.nullable().optional(),
    projects: z.array(ProjectSchema).nullable().optional(),
    tags: z.array(TagSchema).nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()),
    next_page: z
        .object({
            offset: z.string(),
            path: z.string().optional(),
            uri: z.string().optional()
        })
        .nullable()
        .optional()
});

const OutputTaskSchema = z.object({
    gid: z.string(),
    name: z.string().optional(),
    resource_type: z.string().optional(),
    assignee: UserSchema.optional(),
    completed: z.boolean().optional(),
    due_on: z.string().optional(),
    notes: z.string().optional(),
    parent: ParentSchema.optional(),
    permalink_url: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    workspace: WorkspaceSchema.optional(),
    projects: z.array(ProjectSchema).optional(),
    tags: z.array(TagSchema).optional()
});

const OutputSchema = z.object({
    items: z.array(OutputTaskSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List subtasks under a parent task.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-subtasks-for-task',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const optFields = [
            'gid',
            'name',
            'resource_type',
            'assignee',
            'assignee.name',
            'completed',
            'due_on',
            'notes',
            'parent',
            'parent.gid',
            'parent.name',
            'permalink_url',
            'created_at',
            'modified_at',
            'workspace',
            'workspace.gid',
            'workspace.name',
            'projects',
            'projects.gid',
            'projects.name',
            'tags',
            'tags.gid',
            'tags.name'
        ].join(',');

        const response = await nango.get({
            // https://developers.asana.com/reference/getsubtasksfortask
            endpoint: `/api/1.0/tasks/${encodeURIComponent(input.task_gid)}/subtasks`,
            params: {
                opt_fields: optFields,
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.cursor && { offset: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((item) => {
            const task = ProviderTaskSchema.parse(item);
            return {
                gid: task.gid,
                ...(task.name != null && { name: task.name }),
                ...(task.resource_type != null && { resource_type: task.resource_type }),
                ...(task.assignee != null && { assignee: task.assignee }),
                ...(task.completed != null && { completed: task.completed }),
                ...(task.due_on != null && { due_on: task.due_on }),
                ...(task.notes != null && { notes: task.notes }),
                ...(task.parent != null && { parent: task.parent }),
                ...(task.permalink_url != null && { permalink_url: task.permalink_url }),
                ...(task.created_at != null && { created_at: task.created_at }),
                ...(task.modified_at != null && { modified_at: task.modified_at }),
                ...(task.workspace != null && { workspace: task.workspace }),
                ...(task.projects != null && { projects: task.projects }),
                ...(task.tags != null && { tags: task.tags })
            };
        });

        return {
            items,
            ...(providerResponse.next_page != null && { next_cursor: providerResponse.next_page.offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
