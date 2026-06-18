import { createAction } from 'nango';
import { z } from 'zod';

const CategorySchema = z.object({
    id: z.number(),
    name: z.string()
});

const InputSchema = z.object({
    limit: z.number().min(1).max(100).optional(),
    cursor: z.string().optional()
});

const OutputSchema = z.object({
    categories: z.array(CategorySchema),
    next_cursor: z.string().optional()
});

const TaxonomyResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(CategorySchema).optional()
});

const action = createAction({
    description: 'List event categories from Amplitude taxonomy',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input) => {
        const limit = input.limit ?? 100;
        const offset = input.cursor !== undefined ? Number(input.cursor) : 0;
        if (!Number.isInteger(offset) || offset < 0) {
            throw new nango.ActionError({
                message: 'Invalid cursor. Must be a non-negative integer string.'
            });
        }

        // https://amplitude.com/docs/apis/analytics/taxonomy#get-all-event-categories
        const response = await nango.get({
            endpoint: '/api/2/taxonomy/category',
            retries: 3
        });

        const parsed = TaxonomyResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                message: 'Unexpected response from Amplitude Taxonomy API',
                details: parsed.error.issues
            });
        }

        if (!parsed.data.success) {
            throw new nango.ActionError({
                message: 'Amplitude Taxonomy API returned an error'
            });
        }

        const allCategories = parsed.data.data ?? [];
        const categories = allCategories.slice(offset, offset + limit);
        const nextOffset = offset + categories.length;
        const next_cursor = nextOffset < allCategories.length ? String(nextOffset) : undefined;

        return {
            categories,
            next_cursor
        };
    }
});

export default action;
