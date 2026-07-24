import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TimeOffCategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional()
});

const ResponseSchema = z.object({
    categories: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            type: z.string(),
            description: z.string().optional()
        })
    )
});

const sync = createSync({
    description: "Sync the account's time-off categories.",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        TimeOffCategory: TimeOffCategorySchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes /spi/v3/timeoff/categories with no changed-since filter,
        // no deleted-record endpoint, no resumable cursor, and no pagination.
        await nango.trackDeletesStart('TimeOffCategory');

        const config: ProxyConfiguration = {
            // https://workable.readme.io/reference/timeoffcategories
            endpoint: '/spi/v3/timeoff/categories',
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = ResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new Error(`Invalid response from Workable timeoff categories: ${parsed.error.message}`);
        }

        const categories = parsed.data.categories.map((category) => ({
            id: category.id,
            name: category.name,
            type: category.type,
            ...(category.description !== undefined && { description: category.description })
        }));

        if (categories.length > 0) {
            await nango.batchSave(categories, 'TimeOffCategory');
        }

        await nango.trackDeletesEnd('TimeOffCategory');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
