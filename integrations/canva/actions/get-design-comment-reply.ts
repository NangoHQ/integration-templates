import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    designId: z.string().describe('The design ID. Example: "DAHNACmCy_g"'),
    threadId: z.string().describe('The ID of the thread. Example: "KAHNAKVJAd4"'),
    replyId: z.string().describe('The ID of the reply. Example: "KAHNAD33dXY"')
});

const UserSchema = z.object({
    id: z.string(),
    display_name: z.string().optional()
});

const CommentContentSchema = z.object({
    plaintext: z.string(),
    markdown: z.string().optional()
});

const ProviderReplySchema = z.object({
    id: z.string(),
    design_id: z.string(),
    thread_id: z.string(),
    author: UserSchema.optional(),
    content: CommentContentSchema,
    mentions: z.record(z.string(), z.unknown()),
    created_at: z.number().int(),
    updated_at: z.number().int()
});

const GetReplyResponseSchema = z.object({
    reply: ProviderReplySchema
});

const OutputSchema = z.object({
    id: z.string(),
    design_id: z.string(),
    thread_id: z.string(),
    author: z
        .object({
            id: z.string(),
            display_name: z.string().optional()
        })
        .optional(),
    content: z.object({
        plaintext: z.string(),
        markdown: z.string().optional()
    }),
    mentions: z.record(z.string(), z.unknown()),
    created_at: z.number().int(),
    updated_at: z.number().int()
});

const action = createAction({
    description: 'Retrieve one reply in a design comment thread.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['comment:read'],
    endpoint: {
        path: '/actions/get-design-comment-reply',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.canva.dev/docs/connect/api-reference/comments/get-reply/
            endpoint: `/rest/v1/designs/${encodeURIComponent(input.designId)}/comments/${encodeURIComponent(input.threadId)}/replies/${encodeURIComponent(input.replyId)}`,
            retries: 3
        });

        const providerReply = GetReplyResponseSchema.parse(response.data).reply;

        return {
            id: providerReply.id,
            design_id: providerReply.design_id,
            thread_id: providerReply.thread_id,
            ...(providerReply.author !== undefined && {
                author: {
                    id: providerReply.author.id,
                    ...(providerReply.author.display_name !== undefined && {
                        display_name: providerReply.author.display_name
                    })
                }
            }),
            content: {
                plaintext: providerReply.content.plaintext,
                ...(providerReply.content.markdown !== undefined && {
                    markdown: providerReply.content.markdown
                })
            },
            mentions: providerReply.mentions,
            created_at: providerReply.created_at,
            updated_at: providerReply.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
