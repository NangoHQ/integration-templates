import type { FreshdeskArticle } from '../types.js';
import type { Article } from '../../models.js';
/**
 * Maps an FreshdeskArticle object to an Article object
 *
 * @param article The FreshdeskArticle object to convert.
 * @returns Article object representing FreshdeskArticle article information.
 */
export function toArticle(article: FreshdeskArticle): Article {
    return {
        id: article.id,
        created_at: article.created_at,
        updated_at: article.updated_at,
        type: article.type,
        category_id: article.category_id,
        folder_id: article.folder_id,
        hierarchy: article.hierarchy,
        thumbs_up: article.thumbs_up,
        thumbs_down: article.thumbs_down,
        hits: article.hits,
        tags: article.tags,
        seo_data: article.seo_data,
        agent_id: article.agent_id,
        title: article.title,
        description: article.description,
        description_text: article.description_text,
        status: article.status
    };
}
