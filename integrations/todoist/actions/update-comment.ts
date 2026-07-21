import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Comment ID. Example: "6h78PmPWvxqw3H8q"'),
    content: z.string().describe('New comment content. Example: "Updated comment text"')
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    content: z.string(),
    posted_at: z.string(),
    task_id: z.string().optional(),
    project_id: z.string().optional(),
    attachment: z.unknown().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    content: z.string(),
    posted_at: z.string(),
    task_id: z.string().optional(),
    project_id: z.string().optional(),
    attachment: z.unknown().optional()
});

const action = createAction({
    description: "Update a comment's content.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.todoist.com/api/v1/#update-a-comment
            endpoint: `/api/v1/comments/${encodeURIComponent(input.id)}`,
            data: {
                content: input.content
            },
            retries: 3
        });

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            content: providerComment.content,
            posted_at: providerComment.posted_at,
            ...(providerComment.task_id !== undefined && { task_id: providerComment.task_id }),
            ...(providerComment.project_id !== undefined && { project_id: providerComment.project_id }),
            ...(providerComment.attachment !== undefined && { attachment: providerComment.attachment })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
