import type { NangoAction, ProxyConfiguration } from '../../models.js';
import { buildQueryParams } from '../helpers/query.js';
import type { FrontMessageOutput, FrontMessages, SingleConversation } from '../types.js';

export default async function runAction(nango: NangoAction, input: SingleConversation): Promise<FrontMessageOutput> {
    const { query, id } = input;
    const queryString = buildQueryParams(query);
    const urlPath = `/conversations/${id}/messages`;

    const config: ProxyConfiguration = {
        // https://dev.frontapp.com/reference/get-conversation-by-id
        endpoint: queryString ? `${urlPath}?${encodeURIComponent(queryString)}` : urlPath,
        retries: 10
    };

    const resp = await nango.get<{ _results: FrontMessages[]; _links: { self: string; _pagination: { next: string | null } } }>(config);
    const { data } = resp;
    return {
        messages: data._results
    };
}
