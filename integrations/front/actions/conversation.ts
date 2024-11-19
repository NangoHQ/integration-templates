import type { NangoAction, ProxyConfiguration } from '../../models.js';
import type { FrontMessageOutput, SingleConversation } from '../types.js';

export default async function runAction(nango: NangoAction, input: SingleConversation): Promise<FrontMessageOutput> {
    const config: ProxyConfiguration = {
        // https://dev.frontapp.com/reference/get-conversation-by-id
        endpoint: `/conversations/${input.id}/messages`,
        retries: 10
    };

    const resp = await nango.get(config);
    const { data } = resp;
    return {
        messages: data._results
    };
}
