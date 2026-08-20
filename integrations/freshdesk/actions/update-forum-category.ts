import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Forum category ID to update. Example: 3'),
        name: z.string().optional().describe('Unique name of the forum category.'),
        description: z.string().optional().describe('Description of the forum category.')
    })
    .describe('Input to update a discussion forum category in Freshdesk.');

const ProviderCategorySchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the forum category.'),
        name: z.string().describe('Name of the forum category.'),
        description: z.string().describe('Description of the forum category.'),
        created_at: z.string().describe('ISO 8601 timestamp when the category was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the category was last updated.')
    })
    .describe('Updated discussion forum category returned by Freshdesk.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing discussion forum category on the provider.
 * @pitfalls: The provider rejects duplicate category names with a validation error.
 */
const action = createAction({
    description: 'Update a discussion forum category in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: { name?: string; description?: string } = {};
        if (input.name !== undefined) {
            data.name = input.name;
        }
        if (input.description !== undefined) {
            data.description = input.description;
        }

        // https://developers.freshdesk.com/api/#update_a_discussion_category
        const response = await nango.put({
            endpoint: `/api/v2/discussions/categories/${encodeURIComponent(input.id)}`,
            data,
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Forum category not found or update failed.',
                id: input.id
            });
        }

        const category = ProviderCategorySchema.parse(response.data);

        return {
            id: category.id,
            name: category.name,
            description: category.description,
            created_at: category.created_at,
            updated_at: category.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
