import type { NangoAction, ProxyConfiguration } from '../../models.js';
import type { FrontMessageOutput, FrontMessages, SingleConversation } from '../types.js';

export default async function runAction(nango: NangoAction, input: SingleConversation): Promise<FrontMessageOutput> {
    const result = [];

    const config: ProxyConfiguration = {
        // https://dev.frontapp.com/reference/get-conversation-by-id
        endpoint: `/conversations/${input.id}/messages`,
        retries: 3,
        paginate: {
            type: 'link',
            response_path: '_results',
            limit_name_in_request: 'limit',
            link_path_in_response_body: 'next',
            limit: 100
        }
    };

    for await (const messageArray of nango.paginate<FrontMessages>(config)) {
        for (const singleMessage of messageArray) {
            result.push(singleMessage);
        }
    }
    return {
        messages: result
    };
}
