import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Judge.me internal review ID. Example: 1306611514')
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

        const providerResponse = z
            .object({
                message: z.string()
            })
            .parse(response.data);

        return {
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
