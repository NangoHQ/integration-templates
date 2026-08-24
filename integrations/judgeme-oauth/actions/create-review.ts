import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        shop_domain: z.string().describe('Shop domain associated with the review. Example: "fngeneration.myshopify.com"'),
        platform: z.string().describe('E-commerce platform. Example: "shopify"'),
        reviewer_name: z.string().describe('Display name of the reviewer.'),
        reviewer_email: z.string().describe('Email address of the reviewer.'),
        rating: z.number().int().min(1).max(5).describe('Star rating from 1 to 5.'),
        title: z.string().describe('Title of the review.'),
        body: z.string().describe('Body text of the review.'),
        product_id: z.number().int().optional().describe('Judge.me product ID. Provide this or external_id.'),
        external_id: z.string().optional().describe('Platform-specific product ID (e.g. Shopify product ID). Provide this or product_id.')
    })
    .describe('Input for creating a new product review.');

const ProviderResponseSchema = z.object({
    message: z.string()
});

const OutputSchema = z
    .object({
        message: z.string().describe('Status message from Judge.me indicating the review is being processed.')
    })
    .describe('Response confirming the review creation request was accepted.');

/**
 * @tags: [write]
 * @tagReason: Creates a new review on the store; this is a real side effect visible to shoppers.
 * @pitfalls: The API returns an acceptance message and processes the review in the background, so the review is not immediately queryable and cannot be updated after submission.
 */
const action = createAction({
    description: 'Create a new review for a product.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_reviews'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.product_id === undefined && input.external_id === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either product_id or external_id is required to target a product.'
            });
        }

        const data: Record<string, unknown> = {
            shop_domain: input.shop_domain,
            platform: input.platform,
            reviewer_name: input.reviewer_name,
            email: input.reviewer_email,
            rating: input.rating,
            title: input.title,
            body: input.body
        };

        if (input.product_id !== undefined) {
            data['id'] = input.product_id;
        }

        if (input.external_id !== undefined) {
            data['external_id'] = input.external_id;
        }

        // https://judge.me/api/docs
        const response = await nango.post({
            endpoint: '/api/v1/reviews',
            data,
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
