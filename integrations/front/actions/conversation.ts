import type { NangoAction, ProxyConfiguration } from '../../models.js';
import type { FrontMessages, SingleConversation } from '../types.js';

export default async function runAction(nango: NangoAction, input: SingleConversation): Promise<FrontMessages[]> {
    const result = [];

    const config: ProxyConfiguration = {
        // https://dev.frontapp.com/reference/get-conversation-by-id
        endpoint: `/conversations/${input.id}/messages`,
        retries: 10,
        paginate: {
            type: 'link',
            response_path: '_results',
            link_path_in_response_body: 'next',
            limit: 100
        }
    };

    for await (const messageArray of nango.paginate<FrontMessages>(config)) {
        for (const singleMessage of messageArray) {
            result.push(singleMessage);
        }
    }
    return result;
}
