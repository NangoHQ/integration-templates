import { z } from 'zod';
import { createAction } from 'nango';

const PrivateReplyInputSchema = z.object({
    email_body: z.string().describe('Body content of the private reply email sent to the reviewer.'),
    email_subject: z.string().describe('Subject line of the private reply email sent to the reviewer.'),
    review_id: z.number().describe('Judge.me internal ID of the review to reply to.'),
    send_private_email: z.boolean().optional().describe('Whether to send the reply as an email to the reviewer. Defaults to true.')
});

const PrivateReplyOutputSchema = z.object({
    message: z.string().describe('Confirmation message from the provider.'),
    review_id: z.number().describe('Judge.me internal ID of the review that was replied to.')
});

const ProviderResponseSchema = z.union([z.string(), z.object({ message: z.string().optional() }).passthrough(), z.object({}).passthrough()]);

/**
 * @tags: [write, destructive]
 * @tagReason: Sends an irreversible private email reply to a review; the email cannot be unsent, edited, or deleted.
 * @pitfalls: Private replies are sent immediately and cannot be unsent, edited, or deleted; the endpoint may return HTTP 403 if the store's plan lacks private-reply API access.
 */
const action = createAction({
    description: 'Send a private email reply to a reviewer instead of posting publicly.',
    version: '1.0.0',
    input: PrivateReplyInputSchema,
    output: PrivateReplyOutputSchema,
    scopes: ['write_reviews'],

    exec: async (nango, input): Promise<z.infer<typeof PrivateReplyOutputSchema>> => {
        const response = await nango.post({
            // https://judge.me/api/docs#tag/Private-Replies
            endpoint: '/api/v1/private_replies',
            data: {
                review_id: input.review_id,
                send_private_email: input.send_private_email ?? true,
                private_reply: {
                    email_body: input.email_body,
                    email_subject: input.email_subject
                }
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        let message = 'Private reply was created successfully';
        if (typeof providerResponse === 'string') {
            message = providerResponse;
        } else if (typeof providerResponse === 'object' && 'message' in providerResponse && typeof providerResponse.message === 'string') {
            message = providerResponse.message;
        }

        return {
            review_id: input.review_id,
            message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;

