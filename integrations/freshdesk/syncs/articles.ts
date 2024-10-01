import type { NangoSync, Article, ProxyConfiguration } from '../../models';
import type { FreshdeskCategory, FreshdeskFolder, FreshdeskArticle } from '../types';
import { toArticle } from '../mappers/to-article.js';

/**
 * Fetches articles and folders from Freshdesk by first retrieving categories, then folders, and finally articles for each folder.
 * Uses pagination and retries for robust data retrieval and saving.
 *
 * https://developers.freshdesk.com/api/#solution_article_attributes
 * @param nango An instance of NangoSync for handling synchronization tasks.
 * @returns Promise that resolves when all articles are fetched and saved.
 */
export default async function fetchData(nango: NangoSync): Promise<void> {
    const categoriesEndpoint = '/api/v2/solutions/categories';
    const foldersEndpoint = (categoryId: number) => `/api/v2/solutions/categories/${categoryId}/folders`;

    const categoriesConfig: ProxyConfiguration = {
        endpoint: categoriesEndpoint,
        retries: 10
    };

    const categoriesResponse = await nango.get<FreshdeskCategory[]>(categoriesConfig);
    const categories = categoriesResponse.data;

    for (const category of categories) {
        const folderConfig: ProxyConfiguration = {
            endpoint: foldersEndpoint(category.id),
            retries: 10,
            paginate: {
                type: 'link',
                limit_name_in_request: 'per_page',
                link_rel_in_response_header: 'next',
                limit: 100
            }
        };

        for await (const folders of nango.paginate<FreshdeskFolder>(folderConfig)) {
            for (const folder of folders) {
                await fetchArticlesAndSubfolders(nango, folder.id);
            }
        }
    }
}

/**
 * Fetches articles from a given folder and its subfolders recursively if there are subfolders.
 *
 * @param nango An instance of NangoSync for handling synchronization tasks.
 * @param folderId The ID of the folder to fetch articles from.
 * @returns Promise that resolves when all articles in the folder and its subfolders are fetched and saved.
 */
async function fetchArticlesAndSubfolders(nango: NangoSync, folderId: number): Promise<void> {
    // Fetch articles for the current folder
    await fetchArticlesFromFolder(nango, folderId);

    // Fetch subfolders
    const subfolders = await fetchSubfolders(nango, folderId);

    // Process each subfolder recursively if there are subfolders to fetch
    for (const subfolder of subfolders) {
        if (subfolder.sub_folders_count > 0) {
            await fetchArticlesAndSubfolders(nango, subfolder.id);
        } else {
            await fetchArticlesFromFolder(nango, subfolder.id);
        }
    }
}

/**
 * Fetches articles from a given folder.
 *
 * @param nango An instance of NangoSync for handling synchronization tasks.
 * @param folderId The ID of the folder to fetch articles from.
 * @returns Promise that resolves when all articles in the folder are fetched and saved.
 */
async function fetchArticlesFromFolder(nango: NangoSync, folderId: number): Promise<void> {
    const articlesEndpoint = (folderId: number) => `/api/v2/solutions/folders/${folderId}/articles`;
    const articlesConfig: ProxyConfiguration = {
        endpoint: articlesEndpoint(folderId),
        retries: 10,
        paginate: {
            type: 'link',
            limit_name_in_request: 'per_page',
            link_rel_in_response_header: 'next',
            limit: 100
        }
    };

    // Fetch articles for the current folder
    for await (const articles of nango.paginate<FreshdeskArticle>(articlesConfig)) {
        const mappedArticles = articles.map((article: FreshdeskArticle) => toArticle(article));
        if (mappedArticles.length > 0) {
            await nango.batchSave<Article>(mappedArticles, 'Article');
        }
    }
}

/**
 * Fetches subfolders of a given folder.
 *
 * @param nango An instance of NangoSync for handling synchronization tasks.
 * @param folderId The ID of the folder to fetch subfolders from.
 * @returns Promise that resolves to an array of subfolders.
 */
async function fetchSubfolders(nango: NangoSync, folderId: number): Promise<FreshdeskFolder[]> {
    const subfoldersEndpoint = `/api/v2/solutions/folders/${folderId}/subfolders`;
    const subfoldersConfig: ProxyConfiguration = {
        endpoint: subfoldersEndpoint,
        retries: 10,
        paginate: {
            type: 'link',
            limit_name_in_request: 'per_page',
            link_rel_in_response_header: 'next',
            limit: 100
        }
    };

    const subfolders: FreshdeskFolder[] = [];
    for await (const folderBatch of nango.paginate<FreshdeskFolder>(subfoldersConfig)) {
        subfolders.push(...folderBatch);
    }

    return subfolders;
}
