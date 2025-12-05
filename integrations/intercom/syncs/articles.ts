import { createSync } from 'nango';
import type { IntercomArticle } from '../types.js';
import { toArticle } from '../mappers/to-article.js';

import type { ProxyConfiguration } from 'nango';
import { Article } from '../models.js';
import { z } from 'zod';

/**
 * Retrieves Intercom articles from the API, transforms the data into a suitable format,
 * and saves the processed articles using NangoSync. This function handles pagination to ensure
 * that all articles are fetched, converted, and stored correctly.
 *
 * For detailed endpoint documentation, refer to:
 * https://developers.intercom.com/docs/references/rest-api/api.intercom.io/articles/listarticles
 *
 * @param nango An instance of NangoSync for handling synchronization tasks.
 * @returns Promise that resolves when all articles are fetched and saved.
 */
const sync = createSync({
    description: 'Fetches a list of articles from Intercom',
    version: '2.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/articles'
        }
    ],

    models: {
        Article: Article
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/articles/listarticles
            endpoint: '/articles',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                response_path: 'data',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            headers: {
                'Intercom-Version': '2.9'
            },
            retries: 10
        };

        for await (const articles of nango.paginate<IntercomArticle>(config)) {
            const mappedArticles = articles.map((article: IntercomArticle) => toArticle(article));
            await nango.batchSave(mappedArticles, 'Article');
        }
        await nango.deleteRecordsFromPreviousExecutions('Article');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
