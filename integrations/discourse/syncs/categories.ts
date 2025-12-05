import { createSync } from 'nango';
import type { CategoryResponse } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { Category } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'List all categories',
    version: '2.0.0',
    frequency: 'every week',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/categories',
            group: 'Categories'
        }
    ],

    models: {
        Category: Category
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            retries: 10,
            // https://docs.discourse.org/#tag/Categories/operation/listCategories
            endpoint: '/categories'
        };

        const response = await nango.get<CategoryResponse>(config);
        const { categories } = response.data.category_list;

        const createCategories: Category[] = [];
        for (const rawCategory of categories) {
            const category: Category = {
                id: rawCategory.id.toString(),
                name: rawCategory.name,
                description: rawCategory.description,
                color: rawCategory.color,
                slug: rawCategory.slug
            };
            createCategories.push(category);
        }

        await nango.batchSave(createCategories, 'Category');

        await nango.deleteRecordsFromPreviousExecutions('Category');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
