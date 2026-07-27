import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const CategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional()
});

const OutputSchema = z.object({
    categories: z.array(CategorySchema)
});

const action = createAction({
    description: "List the account's time-off categories (PTO, sick leave, etc).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_timeoff'],

    exec: async (nango, _input) => {
        const response = await nango.get({
            // https://workable.readme.io/reference/timeoffcategories.md
            endpoint: '/spi/v3/timeoff/categories',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No data returned from time off categories endpoint'
            });
        }

        const providerData = z
            .object({
                categories: z.array(CategorySchema)
            })
            .parse(response.data);

        return {
            categories: providerData.categories
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
