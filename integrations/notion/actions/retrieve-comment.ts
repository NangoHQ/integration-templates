import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    comment_id: z.string().describe('The ID of the comment to retrieve. Example: "c02fc1d3-db8b-45c5-a222-27595b15aea7"')
});

const RichTextTextSchema = z.object({
    content: z.string()
});

const RichTextMentionSchema = z.object({
    type: z.string(),
    user: z
        .object({
            object: z.string(),
            id: z.string()
        })
        .optional()
});

const RichTextSchema = z.object({
    type: z.string().optional(),
    text: RichTextTextSchema.optional(),
    mention: RichTextMentionSchema.optional(),
    annotations: z
        .object({
            bold: z.boolean().optional(),
            italic: z.boolean().optional(),
            strikethrough: z.boolean().optional(),
            underline: z.boolean().optional(),
            code: z.boolean().optional(),
            color: z.string().optional()
        })
        .optional(),
    plain_text: z.string().optional(),
    href: z.string().nullable().optional()
});

const ParentSchema = z.object({
    type: z.string(),
    page_id: z.string().optional(),
    block_id: z.string().optional()
});

const ProviderCommentSchema = z.object({
    object: z.literal('comment'),
    id: z.string(),
    parent: ParentSchema,
    discussion_id: z.string(),
    rich_text: z.array(RichTextSchema),
    created_by: z
        .object({
            object: z.string(),
            id: z.string()
        })
        .optional(),
    created_time: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    parent: ParentSchema,
    discussion_id: z.string(),
    rich_text: z.array(RichTextSchema),
    created_by: z
        .object({
            object: z.string(),
            id: z.string()
        })
        .optional(),
    created_time: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a Notion comment by comment ID',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_comment'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.notion.com/reference/retrieve-a-comment
        const response = await nango.get({
            endpoint: `/v1/comments/${encodeURIComponent(input.comment_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Comment not found',
                comment_id: input.comment_id
            });
        }

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            parent: providerComment.parent,
            discussion_id: providerComment.discussion_id,
            rich_text: providerComment.rich_text,
            ...(providerComment.created_by && { created_by: providerComment.created_by }),
            ...(providerComment.created_time && { created_time: providerComment.created_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
