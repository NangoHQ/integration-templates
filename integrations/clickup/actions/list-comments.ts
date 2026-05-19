import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        task_id: z.string().optional().describe('Task ID to list comments from. Example: "abc123". Either task_id or list_id must be provided.'),
        list_id: z.string().optional().describe('List ID to list comments from. Example: "123". Either task_id or list_id must be provided.')
    })
    .refine((data) => data.task_id || data.list_id, {
        message: 'Either task_id or list_id must be provided'
    });

const ProviderUserSchema = z.object({
    id: z.number().nullish(),
    username: z.string().nullish(),
    email: z.string().nullish(),
    color: z.string().nullish(),
    profilePicture: z.string().nullish()
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    comment: z.union([z.string(), z.array(z.object({}).passthrough()).optional()]).optional(),
    comment_text: z.string().optional(),
    user: ProviderUserSchema.optional(),
    date: z.string().optional(),
    reply_count: z.number().optional()
});

const ProviderResponseSchema = z.object({
    comments: z.array(ProviderCommentSchema)
});

const CommentOutputSchema = z.object({
    id: z.string(),
    comment: z.union([z.string(), z.array(z.object({}).passthrough()).optional()]).optional(),
    comment_text: z.string().optional(),
    user: ProviderUserSchema.optional(),
    date: z.string().optional(),
    reply_count: z.number().optional()
});

const OutputSchema = z.object({
    comments: z.array(CommentOutputSchema)
});

const action = createAction({
    description: 'List comments from ClickUp',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-comments',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.task_id && !input.list_id) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either task_id or list_id must be provided'
            });
        }

        let endpoint: string;
        if (input.task_id) {
            endpoint = `/api/v2/task/${encodeURIComponent(input.task_id)}/comment`;
        } else {
            endpoint = `/api/v2/list/${encodeURIComponent(input.list_id || '')}/comment`;
        }

        // https://developer.clickup.com/reference/gettaskcomments
        // https://developer.clickup.com/reference/getlistcomments
        const response = await nango.get({
            endpoint: endpoint,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            comments: providerData.comments.map((comment) => ({
                id: comment.id,
                ...(comment.comment !== undefined && { comment: comment.comment }),
                ...(comment.comment_text !== undefined && { comment_text: comment.comment_text }),
                ...(comment.user !== undefined && { user: comment.user }),
                ...(comment.date !== undefined && { date: comment.date }),
                ...(comment.reply_count !== undefined && { reply_count: comment.reply_count })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
