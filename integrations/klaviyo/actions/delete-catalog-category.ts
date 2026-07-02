import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the catalog category. Example: "$custom:::$default:::nango-seed-category-1"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.string().optional()
});

const action = createAction({
    description: 'Delete a catalog category',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developers.klaviyo.com/en/reference/delete_catalog_category
            endpoint: `/api/catalog-categories/${encodeURIComponent(input.id)}`,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        return {
            success: true,
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
