import type { IntercomArticle } from '../types';
import type { Article } from '../../models';
/**
 * Maps an IntercomArticle object to an Article object
 *
 * @param article The IntercomArticle object to convert.
 * @returns Article object representing IntercomArticle article information.
 */
export function toArticle(article: IntercomArticle): Article {
    return {
        type: article.type,
        id: article.id,
        workspace_id: article.workspace_id,
        title: article.title,
        description: article.description,
        body: article.body,
        author_id: article.author_id,
        state: article.state,
        created_at: new Date(article.created_at * 1000).toISOString(),
        updated_at: new Date(article.updated_at * 1000).toISOString(),
        url: article.url,
        parent_id: article.parent_id,
        parent_ids: article.parent_ids,
        parent_type: article.parent_type,
        default_locale: article.default_locale,
        translated_content: article.translated_content
    };
}
