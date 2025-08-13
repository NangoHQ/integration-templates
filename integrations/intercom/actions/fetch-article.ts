import { createAction } from 'nango';
import { toArticle } from '../mappers/to-article.js';

import type { ProxyConfiguration } from 'nango';
import { Article, IdEntity } from '../models.js';

const action = createAction({
    description: 'Fetch a single article from Intercom',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/single-article'
    },

    input: IdEntity,
    output: Article,

    exec: async (nango, input): Promise<Article> => {
        if (!input.id) {
            throw new nango.ActionError({
                message: 'Id is required to delete a user'
            });
        }

        const config: ProxyConfiguration = {
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/articles/retrievearticle
            endpoint: `/articles/${input.id}`,
            retries: 3
        };

        const response = await nango.get(config);

        return toArticle(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
