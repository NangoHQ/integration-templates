import { z } from 'zod';
import { createAction } from 'nango';

const CategoryInputSchema = z.object({
    id: z.number().int(),
    weight: z.string()
});

const InputSchema = z.object({
    id: z.number().int().describe('Customer invoice ID. Example: 25461646082048'),
    categories: z.array(CategoryInputSchema)
});

const ProviderCategorySchema = z.object({
    id: z.number().int(),
    label: z.string(),
    weight: z.string(),
    category_group: z.object({
        id: z.number().int()
    }),
    analytical_code: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderCategoryListSchema = z.array(ProviderCategorySchema);

const CategorySchema = z.object({
    id: z.number().int(),
    label: z.string(),
    weight: z.string(),
    category_group: z.object({
        id: z.number().int()
    }),
    analytical_code: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.array(CategorySchema);

const action = createAction({
    description: 'Replace categories assigned to a customer invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://pennylane.readme.io/reference/putcustomerinvoicecategories
            endpoint: `/api/external/v2/customer_invoices/${encodeURIComponent(input.id)}/categories`,
            data: input.categories,
            retries: 3
        });

        const rawCategories = ProviderCategoryListSchema.parse(response.data);

        return rawCategories.map((rawCategory) => ({
            id: rawCategory.id,
            label: rawCategory.label,
            weight: rawCategory.weight,
            category_group: rawCategory.category_group,
            ...(rawCategory.analytical_code != null && { analytical_code: rawCategory.analytical_code }),
            created_at: rawCategory.created_at,
            updated_at: rawCategory.updated_at
        }));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
