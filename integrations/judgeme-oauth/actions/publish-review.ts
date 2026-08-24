import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        review_id: z.number().describe('Judge.me internal review ID to publish. Example: 1306611514')
    })
    .describe('Input for publishing a previously hidden review.');

const OutputSchema = z
    .object({
        message: z.string().describe('Confirmation message returned by Judge.me.')
    })
    .describe('Output confirming the review was published.');

const ProviderResponseSchema = z.object({
    message: z.string()
});

const ProviderErrorSchema = z.object({
    error: z.string()
});

/**
 * @tags: [write]
 * @tagReason: Mutates the review's curated status to "ok" so it appears on the storefront.
 */
const action = createAction({
    description: 'Publish (show) a previously hidden review.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_reviews'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://judge.me/api/docs
            endpoint: `/api/v1/reviews/${encodeURIComponent(input.review_id)}`,
            data: {
                curated: 'ok'
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

        if (response.status === 422) {
            const parsed = ProviderErrorSchema.safeParse(response.data);
            throw new nango.ActionError({
                type: 'invalid_request',
                message: parsed.success ? parsed.data.error : 'Invalid request',
                review_id: input.review_id
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Judge.me',
                review_id: input.review_id
            });
        }

        return {
            message: parsed.data.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
