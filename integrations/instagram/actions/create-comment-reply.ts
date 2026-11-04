import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        comment_id: z.string().describe('The ID of the Instagram comment to reply to. Example: "17873440459141021"'),
        message: z.string().describe('The text of the reply comment. Example: "Thanks for sharing!"')
    })
    .describe('Input for replying to an Instagram comment.');

const ProviderReplySchema = z.object({
    id: z.string()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The ID of the newly created reply comment.')
    })
    .describe('The newly created reply comment.');

/**
 * @tags: [write]
 * @tagReason: Creates a new reply comment on an existing Instagram comment.
 * @pitfalls: Only top-level comments can be replied to (a reply to a reply is attached to the top-level comment), and hidden comments or comments on live videos cannot be replied to.
 */
const action = createAction({
    description: 'Reply to a comment on Instagram media.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['instagram_business_manage_comments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-comment/replies
            endpoint: `/${encodeURIComponent(input.comment_id)}/replies`,
            data: {
                message: input.message
            },
            // Comment creation is not idempotent, so a retry after a lost response could post a duplicate reply.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const reply = ProviderReplySchema.parse(response.data);

        return {
            id: reply.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
