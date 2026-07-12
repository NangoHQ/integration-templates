import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    story_public_id: z.number().describe('The public ID of the story to comment on. Example: 35'),
    text: z.string().describe('Comment text, supporting Markdown and @mentions via member UUIDs. Example: "Great work!"'),
    parent_id: z.number().optional().describe('The ID of an existing comment to reply to, creating a thread. Example: 37')
});

const ProviderCommentSchema = z.object({
    id: z.number(),
    story_id: z.number(),
    text: z.string(),
    author_id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    parent_id: z.number().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    story_id: z.number(),
    text: z.string(),
    author_id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    parent_id: z.number().optional()
});

const action = createAction({
    description: 'Add a comment to a story.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.shortcut.com/api/rest/v3#Create-Story-Comment
            endpoint: `/api/v3/stories/${encodeURIComponent(String(input.story_public_id))}/comments`,
            data: {
                text: input.text,
                ...(input.parent_id !== undefined && { parent_id: input.parent_id })
            },
            retries: 10
        });

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            story_id: providerComment.story_id,
            text: providerComment.text,
            author_id: providerComment.author_id,
            created_at: providerComment.created_at,
            updated_at: providerComment.updated_at,
            ...(providerComment.parent_id != null && { parent_id: providerComment.parent_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
