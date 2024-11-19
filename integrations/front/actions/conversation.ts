import type { NangoAction, ProxyConfiguration } from '../../models.js';
import { buildQueryParams } from '../helpers/query.js';
import type { FrontMessageOutput, SingleConversation } from '../types.js';

export default async function runAction(nango: NangoAction, input: SingleConversation): Promise<FrontMessageOutput> {
    const { q, id } = input;
    const queryString = buildQueryParams(q);
    const urlPath = `/conversations/${id}/messages`;

    const config: ProxyConfiguration = {
        // https://dev.frontapp.com/reference/get-conversation-by-id
        endpoint: queryString ? `${urlPath}?${encodeURIComponent(queryString)}` : urlPath,
        retries: 10
    };

    const resp = await nango.get(config);
    const { data } = resp;
    return {
        messages: data._results
    };
}
