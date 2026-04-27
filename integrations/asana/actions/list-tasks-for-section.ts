import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    section_gid: z.string().describe('The globally unique identifier for the section. Example: "12345"'),
    cursor: z.string().optional().describe('Pagination cursor (offset token) from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of results per page (1-100). Defaults to 20.'),
    opt_fields: z.array(z.string()).optional().describe('Array of field names to include in the response. Example: ["name", "assignee", "due_on"]')
});

const UserCompactSchema = z.object({
    gid: z.string(),
    resource_type: z.string().optional(),
    name: z.string().optional().nullable()
});

const ProjectCompactSchema = z.object({
    gid: z.string(),
    resource_type: z.string().optional(),
    name: z.string().optional().nullable()
});

const TagCompactSchema = z.object({
    gid: z.string(),
    resource_type: z.string().optional(),
    name: z.string().optional().nullable()
});

const SectionCompactSchema = z.object({
    gid: z.string(),
    resource_type: z.string().optional(),
    name: z.string().optional().nullable()
});

const LikeSchema = z.object({
    user: UserCompactSchema.optional().nullable()
});

const MembershipSchema = z.object({
    project: ProjectCompactSchema.optional().nullable(),
    section: SectionCompactSchema.optional().nullable()
});

const CustomFieldValueSchema = z.object({
    gid: z.string(),
    name: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
    text_value: z.string().optional().nullable(),
    number_value: z.number().optional().nullable(),
    enum_value: z
        .object({
            gid: z.string(),
            name: z.string().optional().nullable(),
            color: z.string().optional().nullable(),
            enabled: z.boolean().optional().nullable()
        })
        .optional()
        .nullable(),
    multi_enum_values: z
        .array(
            z.object({
                gid: z.string(),
                name: z.string().optional().nullable(),
                color: z.string().optional().nullable(),
                enabled: z.boolean().optional().nullable()
            })
        )
        .optional()
        .nullable(),
    display_value: z.string().optional().nullable()
});

const TaskSchema = z.object({
    gid: z.string(),
    resource_type: z.string().optional(),
    name: z.string().optional().nullable(),
    resource_subtype: z.string().optional().nullable(),
    approval_status: z.string().optional().nullable(),
    assignee: UserCompactSchema.optional().nullable(),
    assignee_status: z.string().optional().nullable(),
    completed: z.boolean().optional().nullable(),
    completed_at: z.string().optional().nullable(),
    completed_by: UserCompactSchema.optional().nullable(),
    created_at: z.string().optional().nullable(),
    modified_at: z.string().optional().nullable(),
    dependencies: z
        .array(z.object({ gid: z.string() }))
        .optional()
        .nullable(),
    dependents: z
        .array(z.object({ gid: z.string() }))
        .optional()
        .nullable(),
    due_at: z.string().optional().nullable(),
    due_on: z.string().optional().nullable(),
    start_at: z.string().optional().nullable(),
    start_on: z.string().optional().nullable(),
    external: z.object({ gid: z.string().optional().nullable(), data: z.string().optional().nullable() }).optional().nullable(),
    hearted: z.boolean().optional().nullable(),
    hearts: z.array(LikeSchema).optional().nullable(),
    html_notes: z.string().optional().nullable(),
    is_rendered_as_separator: z.boolean().optional().nullable(),
    liked: z.boolean().optional().nullable(),
    likes: z.array(LikeSchema).optional().nullable(),
    memberships: z.array(MembershipSchema).optional().nullable(),
    modified_by: UserCompactSchema.optional().nullable(),
    notes: z.string().optional().nullable(),
    num_hearts: z.number().optional().nullable(),
    num_likes: z.number().optional().nullable(),
    num_subtasks: z.number().optional().nullable(),
    parent: z.object({ gid: z.string(), resource_type: z.string().optional(), name: z.string().optional().nullable() }).optional().nullable(),
    permalink_url: z.string().optional().nullable(),
    projects: z.array(ProjectCompactSchema).optional().nullable(),
    tags: z.array(TagCompactSchema).optional().nullable(),
    workspace: z.object({ gid: z.string(), resource_type: z.string().optional(), name: z.string().optional().nullable() }).optional().nullable(),
    custom_fields: z.array(CustomFieldValueSchema).optional().nullable(),
    actual_time_minutes: z.number().optional().nullable()
});

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()),
    next_page: z
        .object({
            offset: z.string(),
            path: z.string(),
            uri: z.string()
        })
        .nullable()
        .optional()
});

const OutputSchema = z.object({
    items: z.array(TaskSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List tasks in a project section.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-tasks-for-section',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            limit: input.limit ?? 20,
            ...(input.cursor && { offset: input.cursor }),
            ...(input.opt_fields && input.opt_fields.length > 0 && { opt_fields: input.opt_fields.join(',') })
        };

        const response = await nango.get({
            // https://developers.asana.com/reference/gettasksforsection
            endpoint: `/api/1.0/sections/${input.section_gid}/tasks`,
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const items = parsed.data.map((item) => {
            const task = TaskSchema.parse(item);
            return {
                gid: task.gid,
                resource_type: task.resource_type,
                name: task.name,
                resource_subtype: task.resource_subtype,
                approval_status: task.approval_status,
                assignee: task.assignee,
                assignee_status: task.assignee_status,
                completed: task.completed,
                completed_at: task.completed_at,
                completed_by: task.completed_by,
                created_at: task.created_at,
                modified_at: task.modified_at,
                dependencies: task.dependencies,
                dependents: task.dependents,
                due_at: task.due_at,
                due_on: task.due_on,
                start_at: task.start_at,
                start_on: task.start_on,
                external: task.external,
                hearted: task.hearted,
                hearts: task.hearts,
                html_notes: task.html_notes,
                is_rendered_as_separator: task.is_rendered_as_separator,
                liked: task.liked,
                likes: task.likes,
                memberships: task.memberships,
                modified_by: task.modified_by,
                notes: task.notes,
                num_hearts: task.num_hearts,
                num_likes: task.num_likes,
                num_subtasks: task.num_subtasks,
                parent: task.parent,
                permalink_url: task.permalink_url,
                projects: task.projects,
                tags: task.tags,
                workspace: task.workspace,
                custom_fields: task.custom_fields,
                actual_time_minutes: task.actual_time_minutes
            };
        });

        return {
            items,
            ...(parsed.next_page?.offset != null && { next_cursor: parsed.next_page.offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
