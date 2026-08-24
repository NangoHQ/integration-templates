import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().int().positive().describe('Judge.me internal review ID. Example: 1306611514')
    })
    .describe('Input for hiding a published review from the storefront.');

const OutputSchema = z
    .object({
        message: z.string().describe('Result message from the API indicating the action was performed successfully.')
    })
    .describe('Output confirming the review was hidden.');

/**
 * @tags: [write]
 * @tagReason: Sets the review curated status to spam on the provider, which hides it from the storefront.
 * @pitfalls: Unpublishing marks the review as spam (curated: "spam") rather than a neutral hidden state, and the call returns success even if the review is already hidden.
 */
const action = createAction({
    description: 'Hide a published review from the storefront.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_reviews'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://judge.me/api/docs
            endpoint: `/api/v1/reviews/${encodeURIComponent(input.id)}`,
            data: {
                curated: 'spam'
            },
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Review not found',
                review_id: input.id
            });
        }

        if (response.status === 422) {
            const parsed = z.object({ error: z.string() }).safeParse(response.data);
            throw new nango.ActionError({
                type: 'invalid_request',
                message: parsed.success ? parsed.data.error : 'Invalid request',
                review_id: input.id
            });
        }

        if (response.status >= 400) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Judge.me API error',
                review_id: input.id,
                status: response.status
            });
        }

        const providerResponse = z
            .object({
                message: z.string()
            })
            .safeParse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Judge.me',
                review_id: input.id
            });
        }

        return {
            message: providerResponse.data.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
