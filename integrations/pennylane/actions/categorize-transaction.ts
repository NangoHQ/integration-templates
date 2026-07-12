import { z } from 'zod';
import { createAction } from 'nango';

const CategoryAssignmentSchema = z.object({
    id: z.number().describe('Category ID. Example: 239432757248'),
    weight: z.string().describe('Weight for this category within its group. Example: "1.0"')
});

const InputSchema = z.object({
    transaction_id: z.number().describe('Transaction ID. Example: 25467718930432'),
    categories: z.array(CategoryAssignmentSchema).describe('Categories to assign. Sum of weights in the same group must equal 1.')
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    label: z.string().optional(),
    weight: z.string().optional(),
    analytical_code: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    category_group: z
        .object({
            id: z.number()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.number(),
    label: z.string().optional(),
    weight: z.string().optional(),
    analytical_code: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    category_group: z
        .object({
            id: z.number()
        })
        .optional()
});

const OutputListSchema = z.array(OutputSchema);

const action = createAction({
    description: 'Replace categories assigned to a bank transaction.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputListSchema,
    scopes: ['transactions:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputListSchema>> => {
        const response = await nango.put({
            // https://pennylane.readme.io/reference/puttransactioncategories
            endpoint: `/api/external/v2/transactions/${encodeURIComponent(input.transaction_id)}/categories`,
            data: input.categories,
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Transaction not found or categories could not be updated.',
                transaction_id: input.transaction_id
            });
        }

        const providerCategories = z.array(ProviderCategorySchema).parse(response.data);

        return providerCategories.map((category) => ({
            id: category.id,
            ...(category.label !== undefined && { label: category.label }),
            ...(category.weight !== undefined && { weight: category.weight }),
            ...(category.analytical_code != null && { analytical_code: category.analytical_code }),
            ...(category.created_at !== undefined && { created_at: category.created_at }),
            ...(category.updated_at !== undefined && { updated_at: category.updated_at }),
            ...(category.category_group !== undefined && { category_group: category.category_group })
        }));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
