import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    parent_task_gid: z.string().describe('The globally unique identifier of the parent task. Example: "12345"'),
    name: z.string().describe('The name of the subtask. Example: "Review draft"'),
    assignee: z.string().optional().describe('The user gid to assign the subtask to. Example: "67890"'),
    due_on: z.string().optional().describe('Localized due date in YYYY-MM-DD format. Example: "2024-12-31"'),
    due_at: z.string().optional().describe('UTC due date-time in ISO 8601 format. Example: "2024-12-31T23:59:59.000Z"'),
    notes: z.string().optional().describe('Free-form description of the subtask.'),
    projects: z.array(z.string()).optional().describe('Array of project gids to associate with the subtask at creation time.'),
    workspace: z.string().optional().describe('The workspace gid for the subtask. Example: "54321"'),
    followers: z.array(z.string()).optional().describe('Array of user gids to add as followers.'),
    tags: z.array(z.string()).optional().describe('Array of tag gids to attach to the subtask.'),
    start_on: z.string().optional().describe('Start date in YYYY-MM-DD format. Example: "2024-01-01"'),
    resource_subtype: z.enum(['default_task', 'milestone']).optional().describe('The subtype of the task.'),
    completed: z.boolean().optional().describe('Whether the subtask is marked completed.'),
    liked: z.boolean().optional().describe('Whether the subtask is liked by the authorized user.')
});

const ResourceSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string().optional()
});

const ProviderTaskSchema = z.object({
    data: z.object({
        gid: z.string(),
        resource_type: z.string(),
        name: z.string(),
        resource_subtype: z.string().nullable().optional(),
        assignee: ResourceSchema.nullable().optional(),
        due_on: z.string().nullable().optional(),
        due_at: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        completed: z.boolean().optional(),
        workspace: ResourceSchema.optional(),
        parent: ResourceSchema.nullable().optional(),
        permalink_url: z.string().optional(),
        projects: z.array(ResourceSchema).optional(),
        tags: z.array(ResourceSchema).optional(),
        followers: z.array(ResourceSchema).optional(),
        custom_fields: z.array(z.unknown()).optional()
    })
});

const ResourceOutputSchema = z.object({
    gid: z.string(),
    name: z.string().optional()
});

const OutputSchema = z.object({
    gid: z.string(),
    name: z.string(),
    resource_type: z.string(),
    resource_subtype: z.string().optional(),
    assignee: ResourceOutputSchema.optional(),
    due_on: z.string().optional(),
    due_at: z.string().optional(),
    notes: z.string().optional(),
    completed: z.boolean().optional(),
    workspace: ResourceOutputSchema.optional(),
    parent: ResourceOutputSchema.optional(),
    permalink_url: z.string().optional(),
    projects: z.array(ResourceOutputSchema).optional(),
    tags: z.array(ResourceOutputSchema).optional(),
    followers: z.array(ResourceOutputSchema).optional(),
    custom_fields: z.array(z.unknown()).optional()
});

type ResourceOutput = z.infer<typeof ResourceOutputSchema>;

function normalizeResource(resource: z.infer<typeof ResourceSchema> | null | undefined): ResourceOutput | undefined {
    if (!resource) {
        return undefined;
    }
    return {
        gid: resource.gid,
        ...(resource.name != null && { name: resource.name })
    };
}

interface TaskCreateBody {
    name: string;
    assignee?: string;
    due_on?: string;
    due_at?: string;
    notes?: string;
    projects?: string[];
    workspace?: string;
    followers?: string[];
    tags?: string[];
    start_on?: string;
    resource_subtype?: string;
    completed?: boolean;
    liked?: boolean;
}

const action = createAction({
    description: 'Create a subtask under a parent task.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-subtask',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: TaskCreateBody = {
            name: input.name
        };

        if (input.assignee !== undefined) {
            body.assignee = input.assignee;
        }
        if (input.due_on !== undefined) {
            body.due_on = input.due_on;
        }
        if (input.due_at !== undefined) {
            body.due_at = input.due_at;
        }
        if (input.notes !== undefined) {
            body.notes = input.notes;
        }
        if (input.projects !== undefined) {
            body.projects = input.projects;
        }
        if (input.workspace !== undefined) {
            body.workspace = input.workspace;
        }
        if (input.followers !== undefined) {
            body.followers = input.followers;
        }
        if (input.tags !== undefined) {
            body.tags = input.tags;
        }
        if (input.start_on !== undefined) {
            body.start_on = input.start_on;
        }
        if (input.resource_subtype !== undefined) {
            body.resource_subtype = input.resource_subtype;
        }
        if (input.completed !== undefined) {
            body.completed = input.completed;
        }
        if (input.liked !== undefined) {
            body.liked = input.liked;
        }

        const response = await nango.post({
            // https://developers.asana.com/reference/createsubtaskfortask
            endpoint: `/api/1.0/tasks/${input.parent_task_gid}/subtasks`,
            data: { data: body },
            retries: 3
        });

        const providerTask = ProviderTaskSchema.parse(response.data);
        const task = providerTask.data;

        return {
            gid: task.gid,
            name: task.name,
            resource_type: task.resource_type,
            ...(task.resource_subtype != null && { resource_subtype: task.resource_subtype }),
            ...(task.assignee != null && { assignee: normalizeResource(task.assignee) }),
            ...(task.due_on != null && { due_on: task.due_on }),
            ...(task.due_at != null && { due_at: task.due_at }),
            ...(task.notes != null && { notes: task.notes }),
            ...(task.completed != null && { completed: task.completed }),
            ...(task.workspace != null && { workspace: normalizeResource(task.workspace) }),
            ...(task.parent != null && { parent: normalizeResource(task.parent) }),
            ...(task.permalink_url != null && { permalink_url: task.permalink_url }),
            ...(task.projects != null && {
                projects: task.projects.map((p) => normalizeResource(p)).filter((r): r is ResourceOutput => r !== undefined)
            }),
            ...(task.tags != null && {
                tags: task.tags.map((t) => normalizeResource(t)).filter((r): r is ResourceOutput => r !== undefined)
            }),
            ...(task.followers != null && {
                followers: task.followers.map((f) => normalizeResource(f)).filter((r): r is ResourceOutput => r !== undefined)
            }),
            ...(task.custom_fields != null && { custom_fields: task.custom_fields })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
