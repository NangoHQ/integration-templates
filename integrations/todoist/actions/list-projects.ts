import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(200).optional().describe('Number of items to return per page.')
});

const ProjectSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        color: z.string().optional(),
        parent_id: z.string().nullable().optional(),
        child_order: z.number().optional(),
        comment_count: z.number().optional(),
        is_shared: z.boolean().optional(),
        is_favorite: z.boolean().optional(),
        is_inbox_project: z.boolean().optional(),
        is_team_inbox: z.boolean().optional(),
        view_style: z.string().optional(),
        url: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        is_archived: z.boolean().optional(),
        default_order: z.number().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    results: z.array(z.unknown()),
    next_cursor: z.string().nullable().optional()
});

const OutputSchema = z.object({
    results: z.array(ProjectSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List projects.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.todoist.com/api/v1/#tag/Projects/operation/getGet_Projects
            endpoint: '/api/v1/projects',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const projects = providerResponse.results.map((item) => {
            return ProjectSchema.parse(item);
        });

        return {
            results: projects,
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
