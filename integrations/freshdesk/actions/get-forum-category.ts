import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Unique ID of the forum category. Example: 2')
    })
    .describe('Input to retrieve a single discussion forum category by ID');

const ProviderForumCategorySchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the forum category'),
        name: z.string().describe('Name of the forum category'),
        description: z.string().optional().describe('Description of the forum category'),
        created_at: z.string().optional().describe('Forum category creation timestamp in UTC'),
        updated_at: z.string().optional().describe('Forum category updated timestamp in UTC')
    })
    .describe('A single discussion forum category retrieved from Freshdesk');

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing discussion forum category by ID from the provider.
 * @pitfalls: Blank fields are returned as null rather than being omitted.
 */
const action = createAction({
    description: 'Retrieve a single discussion forum category from Freshdesk',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.freshdesk.com/api/#view_a_discussion_category
        const response = await nango.get({
            endpoint: `/api/v2/discussions/categories/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Forum category not found',
                id: input.id
            });
        }

        const category = ProviderForumCategorySchema.parse(response.data);

        return {
            id: category.id,
            name: category.name,
            ...(category.description !== undefined && { description: category.description }),
            ...(category.created_at !== undefined && { created_at: category.created_at }),
            ...(category.updated_at !== undefined && { updated_at: category.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
