import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('Project ID. Example: "6h78PW84RjxxRW8q"'),
    name: z.string().optional().describe('Updated project name. Passing null or omitting leaves it unchanged.'),
    description: z.string().nullable().optional().describe('Updated project description. Passing null or omitting leaves it unchanged.'),
    color: z.string().nullable().optional().describe('Updated project color. Passing null or omitting leaves it unchanged.'),
    is_favorite: z.boolean().nullable().optional().describe('Whether the project is marked as a favorite. Passing null or omitting leaves it unchanged.'),
    view_style: z.string().nullable().optional().describe('Updated project view style (e.g. list or board). Passing null or omitting leaves it unchanged.')
});

const ProjectAccessSchema = z.object({
    visibility: z.string(),
    configuration: z.record(z.string(), z.unknown())
});

const ProviderProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    parent_id: z.string().nullable().optional(),
    child_order: z.number().optional(),
    default_order: z.number().optional(),
    is_shared: z.boolean().optional(),
    is_favorite: z.boolean().optional(),
    inbox_project: z.boolean().optional(),
    view_style: z.string().optional(),
    is_archived: z.boolean().optional(),
    is_deleted: z.boolean().optional(),
    is_frozen: z.boolean().optional(),
    is_collapsed: z.boolean().optional(),
    can_assign_tasks: z.boolean().optional(),
    can_comment: z.boolean().optional(),
    creator_uid: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    public_access: z.boolean().optional(),
    public_key: z.string().optional(),
    access: ProjectAccessSchema.nullable().optional(),
    role: z.string().optional(),
    goal_ids: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    color: z.string().optional(),
    parent_id: z.string().optional(),
    child_order: z.number().optional(),
    default_order: z.number().optional(),
    is_shared: z.boolean().optional(),
    is_favorite: z.boolean().optional(),
    inbox_project: z.boolean().optional(),
    view_style: z.string().optional(),
    is_archived: z.boolean().optional(),
    is_deleted: z.boolean().optional(),
    is_frozen: z.boolean().optional(),
    is_collapsed: z.boolean().optional(),
    can_assign_tasks: z.boolean().optional(),
    can_comment: z.boolean().optional(),
    creator_uid: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    public_access: z.boolean().optional(),
    public_key: z.string().optional(),
    access: ProjectAccessSchema.nullable().optional(),
    role: z.string().optional(),
    goal_ids: z.array(z.string()).optional()
});

const action = createAction({
    description: "Update a project's fields (name, color, favorite, view style, description).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.todoist.com/api/v1/#tag/Projects/operation/postUpdate_Project_api_v1_projects__project_id__post
            endpoint: `/api/v1/projects/${encodeURIComponent(input.project_id)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.color !== undefined && { color: input.color }),
                ...(input.is_favorite !== undefined && { is_favorite: input.is_favorite }),
                ...(input.view_style !== undefined && { view_style: input.view_style })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Project not found or update failed',
                project_id: input.project_id
            });
        }

        const providerProject = ProviderProjectSchema.parse(response.data);

        return {
            id: providerProject.id,
            ...(providerProject.name != null && { name: providerProject.name }),
            ...(providerProject.description != null && { description: providerProject.description }),
            ...(providerProject.color != null && { color: providerProject.color }),
            ...(providerProject.parent_id != null && { parent_id: providerProject.parent_id }),
            ...(providerProject.child_order !== undefined && { child_order: providerProject.child_order }),
            ...(providerProject.default_order !== undefined && { default_order: providerProject.default_order }),
            ...(providerProject.is_shared !== undefined && { is_shared: providerProject.is_shared }),
            ...(providerProject.is_favorite !== undefined && { is_favorite: providerProject.is_favorite }),
            ...(providerProject.inbox_project !== undefined && { inbox_project: providerProject.inbox_project }),
            ...(providerProject.view_style !== undefined && { view_style: providerProject.view_style }),
            ...(providerProject.is_archived !== undefined && { is_archived: providerProject.is_archived }),
            ...(providerProject.is_deleted !== undefined && { is_deleted: providerProject.is_deleted }),
            ...(providerProject.is_frozen !== undefined && { is_frozen: providerProject.is_frozen }),
            ...(providerProject.is_collapsed !== undefined && { is_collapsed: providerProject.is_collapsed }),
            ...(providerProject.can_assign_tasks !== undefined && { can_assign_tasks: providerProject.can_assign_tasks }),
            ...(providerProject.can_comment !== undefined && { can_comment: providerProject.can_comment }),
            ...(providerProject.creator_uid !== undefined && { creator_uid: providerProject.creator_uid }),
            ...(providerProject.created_at !== undefined && { created_at: providerProject.created_at }),
            ...(providerProject.updated_at !== undefined && { updated_at: providerProject.updated_at }),
            ...(providerProject.public_access !== undefined && { public_access: providerProject.public_access }),
            ...(providerProject.public_key !== undefined && { public_key: providerProject.public_key }),
            ...(providerProject.access !== undefined && { access: providerProject.access }),
            ...(providerProject.role !== undefined && { role: providerProject.role }),
            ...(providerProject.goal_ids !== undefined && { goal_ids: providerProject.goal_ids })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
