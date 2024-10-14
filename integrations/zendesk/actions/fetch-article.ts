import type { NangoAction, ProxyConfiguration, ArticleInput, SingleArticleResponse } from '../../models';
import type { ZendeskArticle } from '../types';

export default async function runAction(nango: NangoAction, input: ArticleInput): Promise<SingleArticleResponse> {
    if (!input.id) {
        throw new nango.ActionError({
            message: 'Article ID is required'
        });
    }

    const metadata = await nango.getMetadata();
    const locale: string = metadata?.['locale'] || 'en-us';

    const config: ProxyConfiguration = {
        // https://developer.zendesk.com/api-reference/help_center/help-center-api/articles/#show-article
        endpoint: `/api/v2/help_center/${locale}/articles/${input.id}`,
        retries: 10
    };

    const response = await nango.get<{ article: ZendeskArticle }>(config);

    return response.data;
}
