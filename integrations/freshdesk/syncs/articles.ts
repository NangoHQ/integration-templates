import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCategorySchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullish(),
    visible_in_portals: z.array(z.number()).nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish()
});

const ProviderFolderSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullish(),
    parent_folder_id: z.number().nullish(),
    hierarchy: z
        .array(
            z.object({
                level: z.number(),
                type: z.string(),
                data: z.object({
                    id: z.number(),
                    name: z.string(),
                    language: z.string()
                })
            })
        )
        .nullish(),
    articles_count: z.number().nullish(),
    sub_folders_count: z.number().nullish(),
    visibility: z.number().nullish(),
    company_ids: z.array(z.number()).nullish(),
    contact_segment_ids: z.array(z.number()).nullish(),
    company_segment_ids: z.array(z.number()).nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish()
});

const ProviderArticleSchema = z.object({
    id: z.number(),
    agent_id: z.number().nullish(),
    category_id: z.number().nullish(),
    description: z.string().nullish(),
    description_text: z.string().nullish(),
    folder_id: z.number().nullish(),
    hierarchy: z
        .array(
            z.object({
                level: z.number(),
                type: z.string(),
                data: z.object({
                    id: z.number(),
                    name: z.string(),
                    language: z.string()
                })
            })
        )
        .nullish(),
    hits: z.number().nullish(),
    status: z.number().nullish(),
    seo_data: z.record(z.string(), z.unknown()).nullish(),
    tags: z.array(z.string()).nullish(),
    thumbs_down: z.number().nullish(),
    thumbs_up: z.number().nullish(),
    title: z.string().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    type: z.number().nullish()
});

const HierarchyNodeSchema = z
    .object({
        level: z.number().describe('Depth level of the hierarchy node'),
        type: z.string().describe('Type of hierarchy node, e.g. category or folder'),
        data: z
            .object({
                id: z.number().describe('ID of the hierarchy node'),
                name: z.string().describe('Name of the hierarchy node'),
                language: z.string().describe('Language code of the hierarchy node')
            })
            .describe('Details of the hierarchy node')
    })
    .describe('A node in the article placement hierarchy');

const ArticleSchema = z
    .object({
        id: z.string().describe('Unique identifier of the solution article'),
        title: z.string().optional().describe('Title of the solution article'),
        description: z.string().optional().describe('HTML description of the solution article'),
        description_text: z.string().optional().describe('Plain text description of the solution article'),
        status: z.number().optional().describe('Publication status of the article (1 = draft, 2 = published)'),
        agent_id: z.number().optional().describe('ID of the agent who created the article'),
        category_id: z.number().optional().describe('ID of the category the article belongs to'),
        folder_id: z.number().optional().describe('ID of the folder the article belongs to'),
        hits: z.number().optional().describe('Number of views for the article'),
        thumbs_up: z.number().optional().describe('Number of upvotes for the article'),
        thumbs_down: z.number().optional().describe('Number of down votes for the article'),
        tags: z.array(z.string()).optional().describe('Tags associated with the article'),
        seo_data: z.record(z.string(), z.unknown()).optional().describe('SEO metadata for the article'),
        hierarchy: z.array(HierarchyNodeSchema).optional().describe('Parent category and folders in which the article is placed'),
        created_at: z.string().optional().describe('Creation timestamp of the article in UTC'),
        updated_at: z.string().optional().describe('Last updated timestamp of the article in UTC')
    })
    .describe('A solution article from the Freshdesk knowledge base');

const sync = createSync({
    description: 'Recursively fetches a list of solution articles.',
    version: '3.0.0',
    frequency: 'every day',
    autoStart: true,
    models: {
        Article: ArticleSchema
    },

    // Delete-tracked syncs must always complete a full enumeration per Nango requirements,
    // so category/folder discovery and the article walk always run in full; there is no
    // resumable checkpoint (an interrupted run is retried from scratch on the next execution).
    exec: async (nango) => {
        const folderIds: number[] = [];
        const categoryConfig: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#solution_category_attributes
            endpoint: '/api/v2/solutions/categories',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        };

        for await (const categories of nango.paginate(categoryConfig)) {
            if (!Array.isArray(categories)) {
                throw new Error('Unexpected response format for categories');
            }
            for (const rawCategory of categories) {
                const category = ProviderCategorySchema.parse(rawCategory);

                const folderConfig: ProxyConfiguration = {
                    // https://developers.freshdesk.com/api/#solution_folder_attributes
                    endpoint: `/api/v2/solutions/categories/${encodeURIComponent(category.id)}/folders`,
                    paginate: {
                        type: 'offset',
                        offset_name_in_request: 'page',
                        offset_start_value: 1,
                        offset_calculation_method: 'per-page',
                        limit_name_in_request: 'per_page',
                        limit: 100
                    },
                    retries: 3
                };

                for await (const folders of nango.paginate(folderConfig)) {
                    if (!Array.isArray(folders)) {
                        throw new Error('Unexpected response format for folders');
                    }
                    for (const rawFolder of folders) {
                        const folder = ProviderFolderSchema.parse(rawFolder);

                        folderIds.push(folder.id);
                        if (folder.sub_folders_count && folder.sub_folders_count > 0) {
                            await discoverSubFolders(nango, folder.id, folderIds);
                        }
                    }
                }
            }
        }

        // Categories, folders, and sub-folders are fully discovered and validated above
        // before the delete-tracking window opens.
        await nango.trackDeletesStart('Article');

        for (const folderId of folderIds) {
            const articleConfig: ProxyConfiguration = {
                // https://developers.freshdesk.com/api/#solution_article_attributes
                endpoint: `/api/v2/solutions/folders/${encodeURIComponent(folderId)}/articles`,
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: 1,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'per_page',
                    limit: 100
                },
                retries: 3
            };

            for await (const articles of nango.paginate(articleConfig)) {
                if (!Array.isArray(articles)) {
                    throw new Error('Unexpected response format for articles');
                }
                const mapped = [];
                for (const rawArticle of articles) {
                    const article = ProviderArticleSchema.parse(rawArticle);
                    mapped.push({
                        id: String(article.id),
                        ...(article.title != null && { title: article.title }),
                        ...(article.description != null && { description: article.description }),
                        ...(article.description_text != null && { description_text: article.description_text }),
                        ...(article.status != null && { status: article.status }),
                        ...(article.agent_id != null && { agent_id: article.agent_id }),
                        ...(article.category_id != null && { category_id: article.category_id }),
                        ...(article.folder_id != null && { folder_id: article.folder_id }),
                        ...(article.hits != null && { hits: article.hits }),
                        ...(article.thumbs_up != null && { thumbs_up: article.thumbs_up }),
                        ...(article.thumbs_down != null && { thumbs_down: article.thumbs_down }),
                        ...(article.tags != null && { tags: article.tags }),
                        ...(article.seo_data != null && { seo_data: article.seo_data }),
                        ...(article.hierarchy != null && { hierarchy: article.hierarchy }),
                        ...(article.created_at != null && { created_at: article.created_at }),
                        ...(article.updated_at != null && { updated_at: article.updated_at })
                    });
                }

                if (mapped.length > 0) {
                    await nango.batchSave(mapped, 'Article');
                }
            }
        }

        await nango.trackDeletesEnd('Article');
    }
});

async function discoverSubFolders(nango: NangoSyncLocal, folderId: number, folderIds: number[]) {
    const subFolderConfig: ProxyConfiguration = {
        // https://developers.freshdesk.com/api/#solution_folder_attributes
        endpoint: `/api/v2/solutions/folders/${encodeURIComponent(folderId)}/subfolders`,
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page',
            offset_start_value: 1,
            offset_calculation_method: 'per-page',
            limit_name_in_request: 'per_page',
            limit: 100
        },
        retries: 3
    };

    for await (const subFolders of nango.paginate(subFolderConfig)) {
        if (!Array.isArray(subFolders)) {
            throw new Error('Unexpected response format for sub-folders');
        }
        for (const rawSubFolder of subFolders) {
            const subFolder = ProviderFolderSchema.parse(rawSubFolder);

            folderIds.push(subFolder.id);
            if (subFolder.sub_folders_count && subFolder.sub_folders_count > 0) {
                await discoverSubFolders(nango, subFolder.id, folderIds);
            }
        }
    }
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
