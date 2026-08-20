import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('Name of the solution category. Must be unique.'),
        description: z.string().optional().describe('Description of the solution category.'),
        visible_in_portals: z
            .array(z.number())
            .optional()
            .describe('Portal IDs where this category is visible. Only allowed when the account has multiple portals enabled.')
    })
    .describe('Input for creating a solution category in Freshdesk.');

const ProviderCategorySchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the created solution category.'),
        name: z.string().describe('Name of the solution category.'),
        description: z.string().optional().describe('Description of the solution category.'),
        created_at: z.string().describe('Timestamp when the category was created, in ISO 8601 format.'),
        updated_at: z.string().describe('Timestamp when the category was last updated, in ISO 8601 format.')
    })
    .describe('Output of the created solution category.');

/**
 * @tags: [write]
 * @tagReason: Creates a new solution category in the helpdesk knowledge base.
 * @pitfalls: Duplicate category names are rejected. visible_in_portals is rejected unless the account has multiple portals enabled.
 */
const action = createAction({
    description: 'Create a solutions category in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.freshdesk.com/api/#create_solution_category
            endpoint: '/api/v2/solutions/categories',
            data: {
                name: input.name,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.visible_in_portals !== undefined && { visible_in_portals: input.visible_in_portals })
            },
            retries: 10
        });

        const category = ProviderCategorySchema.parse(response.data);

        return {
            id: category.id,
            name: category.name,
            ...(category.description != null && { description: category.description }),
            created_at: category.created_at,
            updated_at: category.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
