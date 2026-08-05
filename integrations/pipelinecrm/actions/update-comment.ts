import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    note_id: z.number().describe('Note ID the comment belongs to. Example: 889038936'),
    comment_id: z.number().describe('Comment ID to update. Example: 12195967'),
    comment: z.string().describe('Updated comment content. Example: "Updated comment text"')
});

const ProviderUserSchema = z.object({
    id: z.number().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    avatar_thumb_url: z.string().nullable().optional()
});

const ProviderCommentSchema = z.object({
    id: z.number(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    user_id: z.number().optional(),
    comment: z.string().optional(),
    user: ProviderUserSchema.optional()
});

const OutputSchema = z.object({
    id: z.number(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    user_id: z.number().optional(),
    comment: z.string().optional(),
    user: z
        .object({
            id: z.number().optional(),
            first_name: z.string().optional(),
            last_name: z.string().optional(),
            avatar_thumb_url: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Update an existing comment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: `/api/v3/notes/${encodeURIComponent(String(input.note_id))}/comments/${encodeURIComponent(String(input.comment_id))}.json`,
            data: {
                comment: {
                    comment: input.comment
                }
            },
            retries: 3
        });

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            ...(providerComment.created_at !== undefined && { created_at: providerComment.created_at }),
            ...(providerComment.updated_at !== undefined && { updated_at: providerComment.updated_at }),
            ...(providerComment.user_id !== undefined && { user_id: providerComment.user_id }),
            ...(providerComment.comment !== undefined && { comment: providerComment.comment }),
            ...(providerComment.user !== undefined && {
                user: {
                    ...(providerComment.user.id !== undefined && { id: providerComment.user.id }),
                    ...(providerComment.user.first_name !== undefined && { first_name: providerComment.user.first_name }),
                    ...(providerComment.user.last_name !== undefined && { last_name: providerComment.user.last_name }),
                    ...(providerComment.user.avatar_thumb_url != null && { avatar_thumb_url: providerComment.user.avatar_thumb_url })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
