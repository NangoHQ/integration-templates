import { NangoAction, ProxyConfiguration } from '../../models';
import { FrontMessages, SingleConversation } from '../types';

export default async function runAction(nango: NangoAction, input: SingleConversation): Promise<FrontMessages[]> {
    const config: ProxyConfiguration = {
        // https://dev.frontapp.com/reference/get-conversation-by-id
        endpoint: `/conversations/${input.id}/messages}`,
        retries: 10
    };

    const resp = await nango.post<FrontMessages[]>(config);
    const { data: msg } = resp;
    return msg;
}
