import { createSync } from "nango";
import type { FreshdeskCategory, FreshdeskFolder, FreshdeskArticle } from '../types.js';
import { toArticle } from '../mappers/to-article.js';

import type { ProxyConfiguration } from "nango";
import { Article } from "../models.js";
import { z } from "zod";

/**
 * Fetches articles and folders from Freshdesk by first retrieving categories, then folders, and finally articles for each folder.
 * Uses pagination and retries for robust data retrieval and saving.
 *
 * https://developers.freshdesk.com/api/#solution_article_attributes
 * @param nango An instance of NangoSync for handling synchronization tasks.
 * @returns Promise that resolves when all articles are fetched and saved.
 */
const sync = createSync({
    description: "Recursively fetches a list of solution articles.",
    version: "2.0.0",
    frequency: "every day",
    autoStart: true,
    syncType: "full",
    trackDeletes: true,

    endpoints: [{
        method: "GET",
        path: "/articles"
    }],

    models: {
        Article: Article
    },

    metadata: z.object({}),

    exec: async nango => {
        const foldersEndpoint = (categoryId: number) => `/api/v2/solutions/categories/${categoryId}/folders`;

        const categoriesConfig: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#solutions
            endpoint: '/api/v2/solutions/categories',
            retries: 10
        };
        //https://developers.freshdesk.com/api/#solution_category_attributes
        const categoriesResponse = await nango.get<FreshdeskCategory[]>(categoriesConfig);
        const categories = categoriesResponse.data;

        for (const category of categories) {
            const folderConfig: ProxyConfiguration = {
                // https://developers.freshdesk.com/api/#solutions
                endpoint: foldersEndpoint(category.id),
                retries: 10,
                paginate: {
                    type: 'link',
                    limit_name_in_request: 'per_page',
                    link_rel_in_response_header: 'next',
                    limit: 100
                }
            };

            //https://developers.freshdesk.com/api/#solution_folder_attributes
            for await (const folders of nango.paginate<FreshdeskFolder>(folderConfig)) {
                for (const folder of folders) {
                    await fetchArticlesAndSubfolders(nango, folder.id);
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

/**
 * Fetches articles from a given folder and its subfolders recursively if there are subfolders.
 *
 * @param nango An instance of NangoSync for handling synchronization tasks.
 * @param folderId The ID of the folder to fetch articles from.
 * @returns Promise that resolves when all articles in the folder and its subfolders are fetched and saved.
 */
async function fetchArticlesAndSubfolders(nango: NangoSyncLocal, folderId: number): Promise<void> {
    let subfolders: FreshdeskFolder[] = [];
    // Fetch articles for the current folder
    await fetchArticlesFromFolder(nango, folderId);

    // Fetch subfolders.
    // Some user accounts do not support subfolders. Handling that edge case here.
    // @allowTryCatch
    try {
        subfolders = await fetchSubfolders(nango, folderId);
    } catch (e: any) {
        await nango.log(`error. could not fetch subfolders, reason: ${e.message}`);
        return;
    }

    // Process each subfolder recursively if there are subfolders to fetch
    if (subfolders.length > 0) {
        for (const subfolder of subfolders) {
            if (subfolder.sub_folders_count > 0) {
                await fetchArticlesAndSubfolders(nango, subfolder.id);
            } else {
                await fetchArticlesFromFolder(nango, subfolder.id);
            }
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
async function fetchArticlesFromFolder(nango: NangoSyncLocal, folderId: number): Promise<void> {
    const articlesEndpoint = (folderId: number) => `/api/v2/solutions/folders/${folderId}/articles`;
    const articlesConfig: ProxyConfiguration = {
        // https://developers.freshdesk.com/api/#solutions
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
    //https://developers.freshdesk.com/api/#solution_article_attributes
    for await (const articles of nango.paginate<FreshdeskArticle>(articlesConfig)) {
        const mappedArticles = articles.map((article: FreshdeskArticle) => toArticle(article));
        if (mappedArticles.length > 0) {
            await nango.batchSave(mappedArticles, 'Article');
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
async function fetchSubfolders(nango: NangoSyncLocal, folderId: number): Promise<FreshdeskFolder[]> {
    const subfoldersEndpoint = `/api/v2/solutions/folders/${folderId}/subfolders`;
    const subfoldersConfig: ProxyConfiguration = {
        // https://developers.freshdesk.com/api/#solutions
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
    //https://community.freshworks.dev/t/unable-to-access-the-nested-sub-categories-in-solutions-using-the-api/6084
    for await (const folderBatch of nango.paginate<FreshdeskFolder>(subfoldersConfig)) {
        subfolders.push(...folderBatch);
    }

    return subfolders;
}
