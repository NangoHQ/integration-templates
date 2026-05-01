import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('The name of the task.'),
        workspace: z
            .string()
            .optional()
            .describe('The workspace GID where the task will be created. Required unless projects or parent is specified. Example: "1234567890"'),
        projects: z.array(z.string()).optional().describe('Array of project GIDs to add the task to. Implies the workspace.'),
        parent: z.string().optional().describe('The GID of a parent task. Implies the workspace.'),
        assignee: z.string().optional().describe('The user GID to assign the task to.'),
        notes: z.string().optional().describe('Free-form text description of the task.'),
        due_on: z.string().optional().describe('The due date in YYYY-MM-DD format.'),
        due_at: z.string().optional().describe('The due date and time in ISO 8601 format.'),
        completed: z.boolean().optional().describe('Whether the task is completed.')
    })
    .refine((data) => data.workspace || (data.projects && data.projects.length > 0) || data.parent, {
        message: 'Either workspace, projects, or parent must be provided.',
        path: ['workspace']
    });

const AsanaTaskSchema = z.object({
    gid: z.string(),
    name: z.string(),
    resource_type: z.string(),
    workspace: z
        .object({
            gid: z.string(),
            name: z.string().optional(),
            resource_type: z.string().optional()
        })
        .optional(),
    projects: z
        .array(
            z.object({
                gid: z.string(),
                name: z.string().optional(),
                resource_type: z.string().optional()
            })
        )
        .optional(),
    assignee: z
        .object({
            gid: z.string(),
            name: z.string().optional(),
            resource_type: z.string().optional()
        })
        .nullable()
        .optional(),
    parent: z
        .object({
            gid: z.string(),
            name: z.string().optional(),
            resource_type: z.string().optional()
        })
        .nullable()
        .optional(),
    notes: z.string().optional(),
    due_on: z.string().nullable().optional(),
    due_at: z.string().nullable().optional(),
    completed: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The GID of the created task.'),
    name: z.string().describe('The name of the created task.'),
    workspace_id: z.string().optional().describe('The workspace GID of the task.'),
    project_ids: z.array(z.string()).optional().describe('Array of project GIDs the task belongs to.'),
    parent_id: z.string().optional().describe('The GID of the parent task, if any.'),
    assignee_id: z.string().optional().describe('The assignee user GID.'),
    notes: z.string().optional().describe('The task notes.'),
    due_on: z.string().optional().describe('The due date in YYYY-MM-DD format.'),
    due_at: z.string().optional().describe('The due date and time in ISO 8601 format.'),
    completed: z.boolean().optional().describe('Whether the task is completed.')
});

const AsanaResponseSchema = z.object({
    data: AsanaTaskSchema
});

const action = createAction({
    description: 'Create a task in Asana.',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-task',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload = {
            name: input.name,
            ...(input.workspace !== undefined && { workspace: input.workspace }),
            ...(input.projects !== undefined && { projects: input.projects }),
            ...(input.parent !== undefined && { parent: input.parent }),
            ...(input.assignee !== undefined && { assignee: input.assignee }),
            ...(input.notes !== undefined && { notes: input.notes }),
            ...(input.due_on !== undefined && { due_on: input.due_on }),
            ...(input.due_at !== undefined && { due_at: input.due_at }),
            ...(input.completed !== undefined && { completed: input.completed })
        };

        // https://developers.asana.com/reference/createtask
        const response = await nango.post({
            endpoint: '/api/1.0/tasks',
            data: {
                data: payload
            },
            retries: 1
        });

        const parsed = AsanaResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Asana API: could not parse task data.'
            });
        }

        const task = parsed.data.data;

        return {
            id: task.gid,
            name: task.name,
            ...(task.workspace != null && {
                workspace_id: task.workspace.gid
            }),
            ...(task.projects != null && {
                project_ids: task.projects.map((p) => p.gid)
            }),
            ...(task.parent != null && {
                parent_id: task.parent.gid
            }),
            ...(task.assignee != null && {
                assignee_id: task.assignee.gid
            }),
            ...(task.notes != null && { notes: task.notes }),
            ...(task.due_on != null && { due_on: task.due_on }),
            ...(task.due_at != null && { due_at: task.due_at }),
            ...(task.completed != null && { completed: task.completed })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
