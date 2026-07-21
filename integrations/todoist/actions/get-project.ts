import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('The ID of the project to retrieve. Example: "6h78PW84RjxxRW8q"')
});

const ProviderProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    parent_id: z.string().nullable().optional(),
    child_order: z.number().optional(),
    comment_count: z.number().optional(),
    is_shared: z.boolean().optional(),
    is_favorite: z.boolean().optional(),
    is_inbox_project: z.boolean().optional(),
    is_team_inbox: z.boolean().optional(),
    url: z.string().optional(),
    view_style: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    parent_id: z.string().optional(),
    child_order: z.number().optional(),
    comment_count: z.number().optional(),
    is_shared: z.boolean().optional(),
    is_favorite: z.boolean().optional(),
    is_inbox_project: z.boolean().optional(),
    is_team_inbox: z.boolean().optional(),
    url: z.string().optional(),
    view_style: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.todoist.com/api/v1/#get-get-project
            endpoint: `/api/v1/projects/${encodeURIComponent(input.project_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Project not found',
                project_id: input.project_id
            });
        }

        const project = ProviderProjectSchema.parse(response.data);

        return {
            id: project.id,
            name: project.name,
            color: project.color,
            ...(project.parent_id != null && { parent_id: project.parent_id }),
            ...(project.child_order !== undefined && { child_order: project.child_order }),
            ...(project.comment_count !== undefined && { comment_count: project.comment_count }),
            ...(project.is_shared !== undefined && { is_shared: project.is_shared }),
            ...(project.is_favorite !== undefined && { is_favorite: project.is_favorite }),
            ...(project.is_inbox_project !== undefined && { is_inbox_project: project.is_inbox_project }),
            ...(project.is_team_inbox !== undefined && { is_team_inbox: project.is_team_inbox }),
            ...(project.url !== undefined && { url: project.url }),
            ...(project.view_style !== undefined && { view_style: project.view_style })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
