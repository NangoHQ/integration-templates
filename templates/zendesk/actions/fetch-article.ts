import { createAction } from "nango";
import type { ZendeskArticle } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { SingleArticleResponse, ArticleInput } from "../models.js";

const action = createAction({
    description: "Fetch a single full help center article",
    version: "1.0.0",

    endpoint: {
        method: "GET",
        path: "/single-article"
    },

    input: ArticleInput,
    output: SingleArticleResponse,
    scopes: ["hc:read"],

    exec: async (nango, input): Promise<SingleArticleResponse> => {
        if (!input.id) {
            throw new nango.ActionError({
                message: 'Article ID is required'
            });
        }

        const metadata = await nango.getMetadata();
        const locale: string = metadata && metadata['locale'] ? String(metadata['locale']) : 'en-us';

        const config: ProxyConfiguration = {
            // https://developer.zendesk.com/api-reference/help_center/help-center-api/articles/#show-article
            endpoint: `/api/v2/help_center/${locale}/articles/${input.id}`,
            retries: 3
        };

        const response = await nango.get<{ article: ZendeskArticle }>(config);

        return {
            ...response.data,
            article: {
                ...response.data.article,
                id: response.data.article.id.toString()
            }
        }
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
