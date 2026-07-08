import { z } from 'zod';
import { createAction } from 'nango';

const CategoryAssignmentSchema = z.object({
    id: z.number().describe('Category ID. Example: 239432757248'),
    weight: z.string().describe('Weight as a decimal string between 0 and 1 with max 7 decimals. Example: "0.5"')
});

const InputSchema = z.object({
    customer_id: z.number().describe('Customer ID. Example: 1338468995072'),
    categories: z
        .array(CategoryAssignmentSchema)
        .describe('List of categories to assign to the customer. The sum of weights within the same category group must equal 1.')
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    label: z.string(),
    weight: z.string(),
    category_group: z.object({
        id: z.number()
    }),
    analytical_code: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputItemSchema = z.object({
    id: z.number(),
    label: z.string(),
    weight: z.string(),
    category_group: z.object({
        id: z.number()
    }),
    analytical_code: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.array(OutputItemSchema);

const action = createAction({
    description: 'Replace the analytical categories assigned to a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customers:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://pennylane.readme.io/reference/putcustomercategories
            endpoint: `/api/external/v2/customers/${encodeURIComponent(input.customer_id)}/categories`,
            data: input.categories,
            retries: 3
        });

        const providerCategories = z.array(ProviderCategorySchema).parse(response.data);

        return providerCategories.map((category) => ({
            id: category.id,
            label: category.label,
            weight: category.weight,
            category_group: category.category_group,
            ...(category.analytical_code != null && { analytical_code: category.analytical_code }),
            created_at: category.created_at,
            updated_at: category.updated_at
        }));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
