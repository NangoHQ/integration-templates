import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const IconSizesSchema = z.record(z.string(), z.string());

const CategorySchema = z
    .object({
        id: z.number(),
        name: z.string(),
        icon: z.string().optional(),
        icon_types: z.record(z.string(), IconSizesSchema).optional(),
        subcategories: z
            .array(
                z
                    .object({
                        id: z.number(),
                        name: z.string(),
                        icon: z.string().optional(),
                        icon_types: z.record(z.string(), IconSizesSchema).optional()
                    })
                    .passthrough()
            )
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    categories: z.array(CategorySchema)
});

const action = createAction({
    description: 'List Splitwise expense categories.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-categories',
        group: 'Categories'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://dev.splitwise.com/#tag/other/paths/~1get_categories/get
            endpoint: '/api/v3.0/get_categories',
            retries: 3
        });

        const raw = z
            .object({
                categories: z.array(z.unknown())
            })
            .parse(response.data);

        const categories = raw.categories.map((item) => CategorySchema.parse(item));

        return {
            categories
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
