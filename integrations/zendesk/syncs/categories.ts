import { createSync } from 'nango';
import type { ZendeskCategory } from '../types.js';
import { getSubdomain } from '../helpers/get-subdomain.js';

import type { ProxyConfiguration } from 'nango';
import { Category } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of help center categories',
    version: '2.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/categories',
            group: 'Categories'
        }
    ],

    scopes: ['hc:read'],

    models: {
        Category: Category
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const subdomain = await getSubdomain(nango);
        const metadata = await nango.getMetadata();
        const locale: string = metadata && metadata['locale'] ? String(metadata['locale']) : 'en-us';

        const config: ProxyConfiguration = {
            baseUrlOverride: `https://${subdomain}.zendesk.com`,
            // https://developer.zendesk.com/api-reference/help_center/help-center-api/categories/#list-categories
            endpoint: `/api/v2/help_center/${locale}/categories`,
            retries: 10,
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'meta.after_cursor',
                limit_name_in_request: 'page[size]',
                cursor_name_in_request: 'page[after]',
                limit: 100,
                response_path: 'categories'
            }
        };

        for await (const zCategories of nango.paginate<ZendeskCategory>(config)) {
            const categories: Category[] = zCategories.map((zCategory: ZendeskCategory) => {
                return {
                    id: zCategory.id.toString(),
                    name: zCategory.name,
                    url: zCategory.url,
                    description: zCategory.description
                };
            });

            await nango.batchSave(categories, 'Category');
        }
        await nango.deleteRecordsFromPreviousExecutions('Category');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
