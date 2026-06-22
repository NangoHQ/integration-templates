import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    design_id: z.string().describe('The ID of the design. Example: "DAHNACmCy_g"'),
    thread_id: z.string().describe('The ID of the comment thread. Example: "KAHNAKVJAd4"'),
    message_plaintext: z.string().describe('The reply message in plaintext. Example: "Thanks for the feedback!"')
});

const AuthorSchema = z.object({
    id: z.string(),
    display_name: z.string().optional()
});

const ContentSchema = z.object({
    plaintext: z.string()
});

const ReplySchema = z.object({
    id: z.string(),
    design_id: z.string(),
    thread_id: z.string(),
    author: AuthorSchema.optional(),
    content: ContentSchema
});

const OutputSchema = z.object({
    id: z.string(),
    design_id: z.string(),
    thread_id: z.string(),
    author: AuthorSchema.optional(),
    content: ContentSchema
});

const action = createAction({
    description: 'Create a reply in a design comment thread.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['comment:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.canva.dev/docs/connect/api-reference/comments/create-reply/
            endpoint: `/rest/v1/designs/${encodeURIComponent(input.design_id)}/comments/${encodeURIComponent(input.thread_id)}/replies`,
            data: {
                message_plaintext: input.message_plaintext
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                reply: z.unknown()
            })
            .parse(response.data);

        const reply = ReplySchema.parse(providerResponse.reply);

        return {
            id: reply.id,
            design_id: reply.design_id,
            thread_id: reply.thread_id,
            ...(reply.author !== undefined && { author: reply.author }),
            content: reply.content
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
