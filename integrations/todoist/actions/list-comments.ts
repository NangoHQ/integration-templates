import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_id: z.string().optional().describe('Task ID to fetch comments for. Exactly one of task_id or project_id must be provided.'),
    project_id: z.string().optional().describe('Project ID to fetch comments for. Exactly one of task_id or project_id must be provided.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(200).optional().describe('Maximum number of comments to return per page.')
});

const ProviderCommentSchema = z
    .object({
        id: z.string(),
        posted_uid: z.string().nullable().optional(),
        content: z.string(),
        task_id: z.string().nullable().optional(),
        project_id: z.string().nullable().optional(),
        file_attachment: z.unknown().nullable().optional(),
        uids_to_notify: z.array(z.string()).nullable().optional(),
        is_deleted: z.boolean(),
        posted_at: z.string().nullable().optional(),
        reactions: z.record(z.string(), z.array(z.string())).nullable().optional()
    })
    .passthrough();

const ListResponseSchema = z.object({
    results: z.array(ProviderCommentSchema),
    next_cursor: z.string().nullable().optional()
});

const OutputSchema = z.object({
    results: z.array(ProviderCommentSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List comments on a task or a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.task_id && input.project_id) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Exactly one of task_id or project_id must be provided, not both.'
            });
        }
        if (!input.task_id && !input.project_id) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Exactly one of task_id or project_id must be provided.'
            });
        }

        const response = await nango.get({
            // https://developer.todoist.com/api/v1/#getGet-Comments
            endpoint: '/api/v1/comments',
            params: {
                ...(input.task_id && { task_id: input.task_id }),
                ...(input.project_id && { project_id: input.project_id }),
                ...(input.cursor && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const listResponse = ListResponseSchema.parse(response.data);

        return {
            results: listResponse.results,
            ...(listResponse.next_cursor != null && { next_cursor: listResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
