import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the solution category. Example: 3')
    })
    .describe('Input parameters for retrieving a single Freshdesk solution category.');

const ProviderSolutionCategorySchema = z.object({
    id: z.number(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the solution category.'),
        name: z.string().optional().describe('Name of the solution category.'),
        description: z.string().optional().describe('Description of the solution category.'),
        created_at: z.string().optional().describe('Timestamp when the category was created. ISO 8601 format.'),
        updated_at: z.string().optional().describe('Timestamp when the category was last updated. ISO 8601 format.')
    })
    .describe('A single Freshdesk solution category returned by the provider.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single solutions category from Freshdesk without modifying any data.
 */
const action = createAction({
    description: 'Retrieve a single solutions category from Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.freshdesk.com/api/#solution_category
            endpoint: `/api/v2/solutions/categories/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Solution category not found.',
                id: input.id
            });
        }

        const category = ProviderSolutionCategorySchema.parse(response.data);

        return {
            id: category.id,
            ...(category.name != null && { name: category.name }),
            ...(category.description != null && { description: category.description }),
            ...(category.created_at != null && { created_at: category.created_at }),
            ...(category.updated_at != null && { updated_at: category.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
