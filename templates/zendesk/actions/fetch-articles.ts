import { createAction } from "nango";
import type { ZendeskArticle } from '../types.js';

import type { ProxyConfiguration } from "nango";
import type { ArticleLite} from "../models.js";
import { ArticleResponse } from "../models.js";
import { z } from "zod";

const action = createAction({
    description: "Fetch all help center articles metadata",
    version: "2.0.0",

    endpoint: {
        method: "GET",
        path: "/all-articles"
    },

    input: z.void(),
    output: ArticleResponse,
    scopes: ["hc:read"],

    exec: async (nango): Promise<ArticleResponse> => {
        const metadata = await nango.getMetadata();
        const locale: string = metadata && metadata['locale'] ? String(metadata['locale']) : 'en-us';

        const config: ProxyConfiguration = {
            // https://developer.zendesk.com/api-reference/help_center/help-center-api/articles/#list-articles
            endpoint: `/api/v2/help_center/${locale}/articles`,
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'meta.after_cursor',
                limit_name_in_request: 'page[size]',
                cursor_name_in_request: 'page[after]',
                limit: 100,
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
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
