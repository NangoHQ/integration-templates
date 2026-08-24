import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Unique ID of the solution category to update. Example: 3'),
        name: z.string().optional().describe('Name of the solution category. Must be unique if provided.'),
        description: z.string().optional().describe('Description of the solution category.'),
        visible_in_portals: z
            .array(z.number())
            .optional()
            .describe('List of portal IDs where this category is visible. Allowed only if the account is configured with multiple portals.')
    })
    .describe('Input parameters for updating a Freshdesk solution category.');

const ProviderCategorySchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    visible_in_portals: z.array(z.number()).nullable().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the solution category.'),
        name: z.string().describe('Name of the solution category.'),
        description: z.string().optional().describe('Description of the solution category.'),
        visible_in_portals: z.array(z.number()).optional().describe('List of portal IDs where this category is visible.'),
        created_at: z.string().describe('Solution category creation timestamp in UTC.'),
        updated_at: z.string().describe('Solution category updated timestamp in UTC.')
    })
    .describe('The updated Freshdesk solution category.');

/**
 * @tags: [write]
 * @tagReason: Updates a solutions category on the provider.
 * @pitfalls: name must be unique across categories, and visible_in_portals is only allowed when the account has multiple portals configured.
 */
const action = createAction({
    description: 'Update a solutions category in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.freshdesk.com/api/#update_solution_category
            endpoint: `/api/v2/solutions/categories/${encodeURIComponent(input.id)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.visible_in_portals !== undefined && { visible_in_portals: input.visible_in_portals })
            },
            retries: 3
        });

        const providerCategory = ProviderCategorySchema.parse(response.data);

        return {
            id: providerCategory.id,
            name: providerCategory.name,
            ...(providerCategory.description != null && { description: providerCategory.description }),
            ...(providerCategory.visible_in_portals != null && { visible_in_portals: providerCategory.visible_in_portals }),
            created_at: providerCategory.created_at,
            updated_at: providerCategory.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
