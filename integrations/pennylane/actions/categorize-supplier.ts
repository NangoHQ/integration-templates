import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    supplier_id: z.number().describe('Supplier ID. Example: 1338485968896'),
    categories: z
        .array(
            z.object({
                id: z.number().describe('Category ID. Example: 239432757248'),
                weight: z.string().describe('Weight as a string between 0 and 1. Example: "1"')
            })
        )
        .describe('List of categories to assign to the supplier')
});

const CategorySchema = z.object({
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

const OutputSchema = z.array(CategorySchema);

const action = createAction({
    description: 'Replace categories assigned to a supplier',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['suppliers:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://pennylane.readme.io/reference/putsuppliercategories
            endpoint: `/api/external/v2/suppliers/${encodeURIComponent(String(input.supplier_id))}/categories`,
            data: input.categories,
            retries: 10
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of categories from the provider'
            });
        }

        const categories = response.data.map((item: unknown) => {
            return CategorySchema.parse(item);
        });

        return categories;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
