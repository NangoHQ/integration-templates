import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    note_id: z.number().describe('The ID of the note to add the comment to. Example: 889038936'),
    comment: z.string().describe('The content of the comment. Example: "Great progress!"'),
    user_id: z.number().optional().describe('The ID of the user who owns the comment. Example: 843757')
});

const ProviderUserSchema = z.object({
    id: z.number(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    avatar_thumb_url: z.string().nullish()
});

const ProviderCommentSchema = z.object({
    id: z.number(),
    note_id: z.number().nullish(),
    user_id: z.number().nullish(),
    comment: z.string(),
    edited_by_user_id: z.number().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    user: ProviderUserSchema.nullish()
});

const OutputSchema = z.object({
    id: z.number(),
    note_id: z.number().optional(),
    user_id: z.number().optional(),
    comment: z.string(),
    edited_by_user_id: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    user: z
        .object({
            id: z.number(),
            first_name: z.string().optional(),
            last_name: z.string().optional(),
            avatar_thumb_url: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Add a comment to a note.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: `api/v3/notes/${encodeURIComponent(String(input.note_id))}/comments.json`,
            data: {
                comment: {
                    comment: input.comment,
                    ...(input.user_id !== undefined && { user_id: input.user_id })
                }
            },
            retries: 1
        });

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            comment: providerComment.comment,
            ...(providerComment.note_id != null && { note_id: providerComment.note_id }),
            ...(providerComment.user_id != null && { user_id: providerComment.user_id }),
            ...(providerComment.edited_by_user_id != null && { edited_by_user_id: providerComment.edited_by_user_id }),
            ...(providerComment.created_at != null && { created_at: providerComment.created_at }),
            ...(providerComment.updated_at != null && { updated_at: providerComment.updated_at }),
            ...(providerComment.user != null && {
                user: {
                    id: providerComment.user.id,
                    ...(providerComment.user.first_name != null && { first_name: providerComment.user.first_name }),
                    ...(providerComment.user.last_name != null && { last_name: providerComment.user.last_name }),
                    ...(providerComment.user.avatar_thumb_url != null && { avatar_thumb_url: providerComment.user.avatar_thumb_url })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
