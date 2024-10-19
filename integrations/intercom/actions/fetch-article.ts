import type { NangoAction, ProxyConfiguration, Article, IdEntity } from '../../models';
import { toArticle } from '../mappers/to-article.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<Article> {
    if (!input.id) {
        throw new nango.ActionError({
            message: 'Id is required to delete a user'
        });
    }

    const config: ProxyConfiguration = {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/articles/retrievearticle
        endpoint: `/articles/${input.id}`,
        retries: 10
    };

    const response = await nango.get(config);

    return toArticle(response.data);
}
