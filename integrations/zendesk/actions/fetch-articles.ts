import type { NangoAction, ProxyConfiguration, ArticleLite, ArticleResponse } from '../../models';
import type { ZendeskArticle } from '../types';

export default async function runAction(nango: NangoAction): Promise<ArticleResponse> {
    const metadata = await nango.getMetadata();
    const locale: string = metadata?.['locale'] || 'en-us';

    const config: ProxyConfiguration = {
        // https://developer.zendesk.com/api-reference/help_center/help-center-api/articles/#list-articles
        endpoint: `/api/v2/help_center/${locale}/articles`,
        paginate: {
            response_path: 'articles'
        }
    };

    const articles: ArticleLite[] = [];
    for await (const zArticles of nango.paginate<ZendeskArticle>(config)) {
        const liteArticles = zArticles.map((zArticle: ZendeskArticle) => {
            return {
                id: zArticle.id.toString(),
                title: zArticle.title,
                url: zArticle.url
            };
        });
        articles.push(...liteArticles);
    }

    return {
        articles
    };
}
