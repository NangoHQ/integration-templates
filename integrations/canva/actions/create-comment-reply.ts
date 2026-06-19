import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    designId: z.string().describe('The ID of the design the comment is on. Example: "DAFVztcvd9z"'),
    commentId: z.string().describe('The ID of the inline annotation comment. Example: "KeAZEAjijEb"'),
    message_plaintext: z.string().describe('The reply message in plaintext. Example: "Thanks!"')
});

const ReplyContentSchema = z.object({
    plaintext: z.string(),
    markdown: z.string().optional()
});

const ReplyAuthorSchema = z.object({
    id: z.string(),
    display_name: z.string().optional()
});

const MentionUserSchema = z.object({
    user_id: z.string().optional(),
    team_id: z.string().optional(),
    display_name: z.string().optional()
});

const MentionSchema = z.object({
    tag: z.string(),
    user: MentionUserSchema.optional()
});

const ReplySchema = z.object({
    id: z.string(),
    design_id: z.string(),
    thread_id: z.string(),
    content: ReplyContentSchema,
    mentions: z.record(z.string(), MentionSchema).optional(),
    created_at: z.number(),
    updated_at: z.number(),
    author: ReplyAuthorSchema.optional()
});

const ProviderResponseSchema = z.object({
    reply: ReplySchema
});

const OutputSchema = z.object({
    id: z.string(),
    design_id: z.string(),
    thread_id: z.string(),
    content: ReplyContentSchema,
    mentions: z.record(z.string(), MentionSchema).optional(),
    created_at: z.number(),
    updated_at: z.number(),
    author: ReplyAuthorSchema.optional()
});

const action = createAction({
    description: 'Create a reply to an inline annotation comment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['comment:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.canva.dev/docs/connect/api-reference/comments/create-reply/
            endpoint: `/rest/v1/designs/${encodeURIComponent(input.designId)}/comments/${encodeURIComponent(input.commentId)}/replies`,
            data: {
                message_plaintext: input.message_plaintext
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.reply.id,
            design_id: providerResponse.reply.design_id,
            thread_id: providerResponse.reply.thread_id,
            content: providerResponse.reply.content,
            ...(providerResponse.reply.mentions !== undefined && { mentions: providerResponse.reply.mentions }),
            created_at: providerResponse.reply.created_at,
            updated_at: providerResponse.reply.updated_at,
            ...(providerResponse.reply.author !== undefined && { author: providerResponse.reply.author })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
