import { z } from 'zod';
import { createAction } from 'nango';

const CategoryInputSchema = z.object({
    id: z.number().describe('Category ID. Example: 59'),
    weight: z.string().describe('Weight as a string between 0 and 1 with max 7 decimals. Example: "0.5"')
});

const InputSchema = z.object({
    supplier_invoice_id: z.number().describe('Supplier invoice ID. Example: 42'),
    categories: z.array(CategoryInputSchema).describe('Array of categories to assign. Weights in the same category group must sum to 1.')
});

const ProviderCategoryGroupSchema = z.object({
    id: z.number()
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    label: z.string(),
    weight: z.string(),
    category_group: ProviderCategoryGroupSchema,
    analytical_code: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputCategorySchema = z.object({
    id: z.number(),
    label: z.string(),
    weight: z.string(),
    category_group_id: z.number(),
    analytical_code: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    categories: z.array(OutputCategorySchema)
});

const action = createAction({
    description: 'Replace categories assigned to a supplier invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['supplier_invoices:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://pennylane.readme.io/reference/putsupplierinvoicecategories
            endpoint: `/api/external/v2/supplier_invoices/${encodeURIComponent(input.supplier_invoice_id)}/categories`,
            data: input.categories,
            retries: 3
        });

        const parsed = z.array(ProviderCategorySchema).safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider response did not match expected schema.',
                details: parsed.error.issues
            });
        }

        return {
            categories: parsed.data.map((category) => ({
                id: category.id,
                label: category.label,
                weight: category.weight,
                category_group_id: category.category_group.id,
                ...(category.analytical_code != null && { analytical_code: category.analytical_code }),
                created_at: category.created_at,
                updated_at: category.updated_at
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
