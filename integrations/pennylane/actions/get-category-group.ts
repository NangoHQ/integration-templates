import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('Category group ID. Example: 14148939776')
});

const ProviderCategoryGroupSchema = z.object({
    id: z.number().int(),
    label: z.string(),
    categories: z.object({
        url: z.string()
    }),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.number().int(),
    label: z.string(),
    categories: z.object({
        url: z.string()
    }),
    created_at: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Retrieve an analytical category group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['categories:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getcategorygroup
            endpoint: `/api/external/v2/category_groups/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Category group not found',
                id: input.id
            });
        }

        const providerCategoryGroup = ProviderCategoryGroupSchema.parse(response.data);

        return {
            id: providerCategoryGroup.id,
            label: providerCategoryGroup.label,
            categories: providerCategoryGroup.categories,
            created_at: providerCategoryGroup.created_at,
            updated_at: providerCategoryGroup.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
