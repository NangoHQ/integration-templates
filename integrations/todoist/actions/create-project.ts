import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the project. Example: "Vacation Planning"'),
    description: z.string().nullable().optional().describe('Description of the project.'),
    parent_id: z.string().nullable().optional().describe('Parent project ID. If provided, creates this project as a sub-project.'),
    color: z.union([z.string(), z.number()]).nullable().optional().describe('Color of the project icon. Defaults to "charcoal".'),
    is_favorite: z.boolean().optional().describe('Whether the project is a favorite for the user. Defaults to false.'),
    view_style: z.string().nullable().optional().describe('View style of the project.'),
    workspace_id: z.number().nullable().optional().describe('Workspace ID. If provided, creates a workspace project instead of a personal project.')
});

const ProviderProjectSchema = z
    .object({
        id: z.string(),
        can_assign_tasks: z.boolean().optional(),
        can_comment: z.boolean().optional(),
        child_order: z.number().optional(),
        is_collapsed: z.boolean().optional(),
        color: z.union([z.string(), z.number()]).optional(),
        creator_uid: z.string().optional(),
        created_at: z.string().optional(),
        is_archived: z.boolean().optional(),
        is_deleted: z.boolean().optional(),
        is_favorite: z.boolean().optional(),
        is_frozen: z.boolean().optional(),
        name: z.string().optional(),
        is_shared: z.boolean().optional(),
        updated_at: z.string().optional(),
        view_style: z.string().nullable().optional(),
        default_order: z.number().optional(),
        description: z.string().nullable().optional(),
        parent_id: z.string().nullable().optional(),
        inbox_project: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    can_assign_tasks: z.boolean().optional(),
    can_comment: z.boolean().optional(),
    child_order: z.number().optional(),
    is_collapsed: z.boolean().optional(),
    color: z.union([z.string(), z.number()]).optional(),
    creator_uid: z.string().optional(),
    created_at: z.string().optional(),
    is_archived: z.boolean().optional(),
    is_deleted: z.boolean().optional(),
    is_favorite: z.boolean().optional(),
    is_frozen: z.boolean().optional(),
    name: z.string().optional(),
    is_shared: z.boolean().optional(),
    updated_at: z.string().optional(),
    view_style: z.string().optional(),
    default_order: z.number().optional(),
    description: z.string().optional(),
    parent_id: z.string().optional(),
    inbox_project: z.boolean().optional()
});

const action = createAction({
    description: 'Create a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.todoist.com/api/v1/#tag/Projects/operation/create_project_api_v1_projects_post
        const response = await nango.post({
            endpoint: '/api/v1/projects',
            data: {
                name: input.name,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.parent_id !== undefined && { parent_id: input.parent_id }),
                ...(input.color !== undefined && { color: input.color }),
                ...(input.is_favorite !== undefined && { is_favorite: input.is_favorite }),
                ...(input.view_style !== undefined && { view_style: input.view_style }),
                ...(input.workspace_id !== undefined && { workspace_id: input.workspace_id })
            },
            retries: 10
        });

        const providerProject = ProviderProjectSchema.parse(response.data);

        return {
            id: providerProject.id,
            ...(providerProject.can_assign_tasks !== undefined && { can_assign_tasks: providerProject.can_assign_tasks }),
            ...(providerProject.can_comment !== undefined && { can_comment: providerProject.can_comment }),
            ...(providerProject.child_order !== undefined && { child_order: providerProject.child_order }),
            ...(providerProject.is_collapsed !== undefined && { is_collapsed: providerProject.is_collapsed }),
            ...(providerProject.color !== undefined && { color: providerProject.color }),
            ...(providerProject.creator_uid !== undefined && { creator_uid: providerProject.creator_uid }),
            ...(providerProject.created_at !== undefined && { created_at: providerProject.created_at }),
            ...(providerProject.is_archived !== undefined && { is_archived: providerProject.is_archived }),
            ...(providerProject.is_deleted !== undefined && { is_deleted: providerProject.is_deleted }),
            ...(providerProject.is_favorite !== undefined && { is_favorite: providerProject.is_favorite }),
            ...(providerProject.is_frozen !== undefined && { is_frozen: providerProject.is_frozen }),
            ...(providerProject.name !== undefined && { name: providerProject.name }),
            ...(providerProject.is_shared !== undefined && { is_shared: providerProject.is_shared }),
            ...(providerProject.updated_at !== undefined && { updated_at: providerProject.updated_at }),
            ...(providerProject.view_style != null && { view_style: providerProject.view_style }),
            ...(providerProject.default_order !== undefined && { default_order: providerProject.default_order }),
            ...(providerProject.description != null && { description: providerProject.description }),
            ...(providerProject.parent_id != null && { parent_id: providerProject.parent_id }),
            ...(providerProject.inbox_project !== undefined && { inbox_project: providerProject.inbox_project })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
