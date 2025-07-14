import type { NangoSync, Article, ProxyConfiguration } from '../../models.js';
import type { IntercomArticle } from '../types.js';
import { toArticle } from '../mappers/to-article.js';

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
export default async function fetchData(nango: NangoSync): Promise<void> {
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
        await nango.batchSave<Article>(mappedArticles, 'Article');
    }
}
