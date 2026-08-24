import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().int().positive().describe('Judge.me internal ID of the reviewer.')
    })
    .describe('Input for fetching a single reviewer profile by id.');

const ProviderReviewerSchema = z.object({
    id: z.number(),
    email: z.string(),
    name: z.string(),
    phone: z.string().nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
    accepts_marketing: z.boolean(),
    unsubscribed_at: z.string().nullable().optional(),
    external_id: z.number().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Judge.me internal ID of the reviewer.'),
        email: z.string().describe('Email address of the reviewer.'),
        name: z.string().describe('Name of the reviewer.'),
        phone: z.string().optional().describe('Phone number of the reviewer.'),
        tags: z.array(z.string()).optional().describe('Tags associated with the reviewer.'),
        accepts_marketing: z.boolean().describe('Whether the reviewer accepts marketing communications.'),
        unsubscribed_at: z.string().optional().describe('ISO 8601 timestamp when the reviewer unsubscribed from marketing.'),
        external_id: z.number().optional().describe('External (Shopify) ID of the reviewer.')
    })
    .describe('A single reviewer profile from Judge.me.');

/**
 * @tags: [read]
 * @tagReason: Fetches a single reviewer profile from the provider.
 */
const action = createAction({
    description: 'Fetch a single reviewer profile by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_reviewers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://judge.me/api/docs
            endpoint: '/api/v1/reviewers/' + encodeURIComponent(String(input.id)),
            retries: 3
        });

        const ResponseSchema = z.object({
            reviewer: ProviderReviewerSchema
        });

        const parsed = ResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Reviewer not found or invalid response'
            });
        }

        const providerReviewer = parsed.data.reviewer;

        return {
            id: providerReviewer.id,
            email: providerReviewer.email,
            name: providerReviewer.name,
            ...(providerReviewer.phone != null && { phone: providerReviewer.phone }),
            ...(providerReviewer.tags != null && { tags: providerReviewer.tags }),
            accepts_marketing: providerReviewer.accepts_marketing,
            ...(providerReviewer.unsubscribed_at != null && { unsubscribed_at: providerReviewer.unsubscribed_at }),
            ...(providerReviewer.external_id != null && { external_id: providerReviewer.external_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
