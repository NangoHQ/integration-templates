import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('Name of the forum category. Must be unique across the account.'),
        description: z.string().optional().describe('Description of the forum category.')
    })
    .describe('Input to create a discussion forum category in Freshdesk.');

const ProviderCategorySchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the forum category.'),
        name: z.string().describe('Name of the forum category.'),
        description: z.string().optional().describe('Description of the forum category.'),
        created_at: z.string().describe('ISO 8601 timestamp when the category was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the category was last updated.')
    })
    .describe('Output returned after creating a discussion forum category in Freshdesk.');

/**
 * @tags: [write]
 * @tagReason: Creates a new discussion forum category in Freshdesk.
 * @pitfalls: Category names must be unique across the account; reusing an existing name returns a 409 duplicate_value error.
 */
const action = createAction({
    description: 'Create a discussion forum category in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.freshdesk.com/api/#create_a_forum_category
            endpoint: '/api/v2/discussions/categories',
            data: {
                name: input.name,
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 10
        });

        const providerCategory = ProviderCategorySchema.parse(response.data);

        return {
            id: providerCategory.id,
            name: providerCategory.name,
            ...(providerCategory.description != null && { description: providerCategory.description }),
            created_at: providerCategory.created_at,
            updated_at: providerCategory.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
