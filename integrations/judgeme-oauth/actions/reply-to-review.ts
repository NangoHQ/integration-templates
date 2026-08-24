import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        review_id: z.number().int().positive().describe('Judge.me internal ID of the review to reply to. Example: 111'),
        content: z.string().describe('The public reply body text shown on the storefront widget. Example: "Thanks for the review!"'),
        send_reply_email: z.boolean().optional().describe('Whether to send an email notification to the reviewer. Defaults to true.')
    })
    .describe('Input for posting a public reply to a Judge.me review.');

const ProviderResponseSchema = z.object({
    message: z.string()
});

const OutputSchema = z
    .object({
        success: z.boolean().describe('Whether the reply was posted successfully.'),
        message: z.string().describe('Provider confirmation message.')
    })
    .describe('Output confirming a public reply was posted to a Judge.me review.');

/**
 * @tags: [write]
 * @tagReason: Posts a public reply to an existing review on the Judge.me storefront widget.
 * @pitfalls: Replying to a review sends an email notification to the reviewer by default unless send_reply_email is set to false.
 */
const action = createAction({
    description: 'Post a public reply to a review, shown on the storefront widget.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_reviews'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://judge.me/api/docs
            endpoint: `/api/v1/reviews/${encodeURIComponent(input.review_id)}`,
            data: {
                reply: {
                    content: input.content
                },
                ...(input.send_reply_email !== undefined && { send_reply_email: input.send_reply_email })
            },
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Review not found',
                review_id: input.review_id
            });
        }

        if (response.status >= 400) {
            const parsedError = z.object({ error: z.string() }).safeParse(response.data);
            throw new nango.ActionError({
                type: response.status === 422 ? 'invalid_request' : 'provider_error',
                message: parsedError.success ? parsedError.data.error : 'Judge.me API error',
                review_id: input.review_id
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            success: true,
            message: parsed.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
