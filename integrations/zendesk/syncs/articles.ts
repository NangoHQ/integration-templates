import { createSync } from 'nango';
import { getSubdomain } from '../helpers/get-subdomain.js';
import type { ZendeskArticle } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { Article } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of articles in Help center from Zendesk',
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

    scopes: ['hc:read'],

    models: {
        Article: Article
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const subdomain = await getSubdomain(nango);
        const metadata = await nango.getMetadata();
        const locale: string = metadata && metadata['locale'] ? String(metadata['locale']) : 'en-us';

        const config: ProxyConfiguration = {
            baseUrlOverride: `https://${subdomain}.zendesk.com`,
            // https://developer.zendesk.com/api-reference/help_center/help-center-api/articles/#list-articles
            endpoint: `/api/v2/help_center/${locale}/articles`,
            retries: 10,
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'meta.after_cursor',
                limit_name_in_request: 'page[size]',
                cursor_name_in_request: 'page[after]',
                limit: 100,
                response_path: 'articles'
            }
        };

        for await (const zArticles of nango.paginate<ZendeskArticle>(config)) {
            const articles: Article[] = zArticles.map(mapZendeskArticleToArticle);
            await nango.batchSave(articles, 'Article');
        }
    await nango.deleteRecordsFromPreviousExecutions("Article");
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function mapZendeskArticleToArticle(article: ZendeskArticle): Article {
    return {
        id: article.id.toString(),
        title: article.title,
        locale: article.locale,
        user_segment_id: article.user_segment_id,
        permission_group_id: article.permission_group_id,
        author_id: article.author_id,
        body: article.body,
        comments_disabled: article.comments_disabled,
        content_tag_ids: article.content_tag_ids,
        created_at: article.created_at,
        draft: article.draft,
        edited_at: article.edited_at,
        html_url: article.html_url,
        label_names: article.label_names,
        outdated: article.outdated,
        outdated_locales: article.outdated_locales,
        position: article.position,
        promoted: article.promoted,
        section_id: article.section_id,
        source_locale: article.source_locale,
        updated_at: article.updated_at,
        url: article.url,
        vote_count: article.vote_count,
        vote_sum: article.vote_sum
    };
}
