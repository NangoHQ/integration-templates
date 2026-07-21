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

const ProviderProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    parent_id: z.string().nullable().optional(),
    order: z.number().optional(),
    comment_count: z.number().optional(),
    is_shared: z.boolean().optional(),
    is_favorite: z.boolean().optional(),
    is_inbox_project: z.boolean().optional(),
    is_team_inbox: z.boolean().optional(),
    view_style: z.string().optional(),
    url: z.string().optional(),
    is_archived: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    color: z.string().optional(),
    parent_id: z.string().optional(),
    order: z.number().optional(),
    comment_count: z.number().optional(),
    is_shared: z.boolean().optional(),
    is_favorite: z.boolean().optional(),
    is_inbox_project: z.boolean().optional(),
    is_team_inbox: z.boolean().optional(),
    view_style: z.string().optional(),
    url: z.string().optional(),
    is_archived: z.boolean().optional()
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
            ...(providerProject.order != null && { order: providerProject.order }),
            ...(providerProject.comment_count != null && { comment_count: providerProject.comment_count }),
            ...(providerProject.is_shared != null && { is_shared: providerProject.is_shared }),
            ...(providerProject.is_favorite != null && { is_favorite: providerProject.is_favorite }),
            ...(providerProject.is_inbox_project != null && { is_inbox_project: providerProject.is_inbox_project }),
            ...(providerProject.is_team_inbox != null && { is_team_inbox: providerProject.is_team_inbox }),
            ...(providerProject.view_style != null && { view_style: providerProject.view_style }),
            ...(providerProject.url != null && { url: providerProject.url }),
            ...(providerProject.is_archived != null && { is_archived: providerProject.is_archived })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
