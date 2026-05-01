import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_gid: z.string().min(1).describe('The globally unique identifier of the task to update. Example: "123456789"'),
    name: z.string().optional().describe('The new name of the task.'),
    notes: z.string().optional().describe('Free-form textual information associated with the task (its description).'),
    assignee: z.string().nullable().optional().describe('The user gid to assign the task to, or null to remove the assignee.'),
    completed: z.boolean().optional().describe('Whether the task is marked complete.'),
    due_at: z.string().nullable().optional().describe('The UTC due date and time as an ISO 8601 string, or null to clear.'),
    due_on: z.string().nullable().optional().describe('The localized due date as YYYY-MM-DD, or null to clear.'),
    start_on: z.string().nullable().optional().describe('The start date as YYYY-MM-DD, or null to clear.'),
    custom_fields: z.record(z.string(), z.unknown()).nullable().optional().describe('Custom field values keyed by custom field gid, or null to clear all.'),
    parent: z.string().nullable().optional().describe('The parent task gid to make this a subtask, or null to remove parent.'),
    html_notes: z.string().optional().describe('HTML-formatted notes for the task.'),
    liked: z.boolean().optional().describe('Whether the task is liked by the authenticated user.'),
    resource_subtype: z.string().optional().describe('The subtype of the task, e.g. "default_task".'),
    approval_status: z.string().optional().describe('The approval status of the task, e.g. "pending", "approved", "rejected".')
});

const UserCompactSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string().optional()
});

const SectionCompactSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string().optional()
});

const ProjectCompactSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string().optional()
});

const TagCompactSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string().optional()
});

const WorkspaceCompactSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string().optional()
});

const CustomFieldEnumOptionSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string().optional(),
    color: z.string().optional(),
    enabled: z.boolean().optional()
});

const CustomFieldValueSchema = z.object({
    gid: z.string(),
    resource_type: z.string().optional(),
    type: z.string().optional(),
    name: z.string().optional(),
    enum_value: CustomFieldEnumOptionSchema.nullable().optional(),
    number_value: z.number().nullable().optional(),
    text_value: z.string().nullable().optional(),
    display_value: z.string().nullable().optional()
});

const ParentTaskSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string().optional()
});

const ExternalDataSchema = z.object({
    gid: z.string(),
    data: z.string()
});

const ProviderTaskSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string().optional(),
    notes: z.string().optional(),
    html_notes: z.string().optional(),
    completed: z.boolean().optional(),
    completed_at: z.string().nullable().optional(),
    due_at: z.string().nullable().optional(),
    due_on: z.string().nullable().optional(),
    start_on: z.string().nullable().optional(),
    assignee: UserCompactSchema.nullable().optional(),
    assignee_section: SectionCompactSchema.nullable().optional(),
    custom_fields: z.array(CustomFieldValueSchema).optional(),
    parent: ParentTaskSchema.nullable().optional(),
    projects: z.array(ProjectCompactSchema).optional(),
    tags: z.array(TagCompactSchema).optional(),
    workspace: WorkspaceCompactSchema.optional(),
    followers: z.array(UserCompactSchema).optional(),
    liked: z.boolean().optional(),
    likes: z.array(z.unknown()).optional(),
    resource_subtype: z.string().optional(),
    approval_status: z.string().optional(),
    external: ExternalDataSchema.nullable().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    permalink_url: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: ProviderTaskSchema
});

const OutputSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string().optional(),
    notes: z.string().optional(),
    html_notes: z.string().optional(),
    completed: z.boolean().optional(),
    completed_at: z.string().optional(),
    due_at: z.string().optional(),
    due_on: z.string().optional(),
    start_on: z.string().optional(),
    assignee: UserCompactSchema.optional(),
    assignee_section: SectionCompactSchema.optional(),
    custom_fields: z.array(CustomFieldValueSchema).optional(),
    parent: ParentTaskSchema.optional(),
    projects: z.array(ProjectCompactSchema).optional(),
    tags: z.array(TagCompactSchema).optional(),
    workspace: WorkspaceCompactSchema.optional(),
    followers: z.array(UserCompactSchema).optional(),
    liked: z.boolean().optional(),
    resource_subtype: z.string().optional(),
    approval_status: z.string().optional(),
    external: ExternalDataSchema.optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    permalink_url: z.string().optional()
});

function buildUpdatePayload(input: z.infer<typeof InputSchema>): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (input.name !== undefined) {
        payload['name'] = input.name;
    }
    if (input.notes !== undefined) {
        payload['notes'] = input.notes;
    }
    if (input.html_notes !== undefined) {
        payload['html_notes'] = input.html_notes;
    }
    if (input.assignee !== undefined) {
        payload['assignee'] = input.assignee;
    }
    if (input.completed !== undefined) {
        payload['completed'] = input.completed;
    }
    if (input.due_at !== undefined) {
        payload['due_at'] = input.due_at;
    }
    if (input.due_on !== undefined) {
        payload['due_on'] = input.due_on;
    }
    if (input.start_on !== undefined) {
        payload['start_on'] = input.start_on;
    }
    if (input.custom_fields !== undefined) {
        payload['custom_fields'] = input.custom_fields;
    }
    if (input.parent !== undefined) {
        payload['parent'] = input.parent;
    }
    if (input.liked !== undefined) {
        payload['liked'] = input.liked;
    }
    if (input.resource_subtype !== undefined) {
        payload['resource_subtype'] = input.resource_subtype;
    }
    if (input.approval_status !== undefined) {
        payload['approval_status'] = input.approval_status;
    }

    return payload;
}

const action = createAction({
    description: 'Update mutable fields on a task.',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-task',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload = buildUpdatePayload(input);

        // https://developers.asana.com/reference/updatetask
        const response = await nango.put({
            endpoint: `/api/1.0/tasks/${encodeURIComponent(input.task_gid)}`,
            data: {
                data: payload
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response format.',
                details: parsed.error.format()
            });
        }

        const task = parsed.data.data;

        return {
            gid: task.gid,
            resource_type: task.resource_type,
            ...(task.name !== undefined && { name: task.name }),
            ...(task.notes !== undefined && { notes: task.notes }),
            ...(task.html_notes !== undefined && { html_notes: task.html_notes }),
            ...(task.completed !== undefined && { completed: task.completed }),
            ...(task.completed_at !== undefined && task.completed_at !== null && { completed_at: task.completed_at }),
            ...(task.due_at !== undefined && task.due_at !== null && { due_at: task.due_at }),
            ...(task.due_on !== undefined && task.due_on !== null && { due_on: task.due_on }),
            ...(task.start_on !== undefined && task.start_on !== null && { start_on: task.start_on }),
            ...(task.assignee !== undefined && task.assignee !== null && { assignee: task.assignee }),
            ...(task.assignee_section !== undefined && task.assignee_section !== null && { assignee_section: task.assignee_section }),
            ...(task.custom_fields !== undefined && { custom_fields: task.custom_fields }),
            ...(task.parent !== undefined && task.parent !== null && { parent: task.parent }),
            ...(task.projects !== undefined && { projects: task.projects }),
            ...(task.tags !== undefined && { tags: task.tags }),
            ...(task.workspace !== undefined && { workspace: task.workspace }),
            ...(task.followers !== undefined && { followers: task.followers }),
            ...(task.liked !== undefined && { liked: task.liked }),
            ...(task.resource_subtype !== undefined && { resource_subtype: task.resource_subtype }),
            ...(task.approval_status !== undefined && { approval_status: task.approval_status }),
            ...(task.external !== undefined && task.external !== null && { external: task.external }),
            ...(task.created_at !== undefined && { created_at: task.created_at }),
            ...(task.modified_at !== undefined && { modified_at: task.modified_at }),
            ...(task.permalink_url !== undefined && { permalink_url: task.permalink_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
