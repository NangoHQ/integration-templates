import type { NangoSync, Conversation, ProxyConfiguration } from '../../models';
import { toConversation } from '../mappers/toConversation';
import type { FrontConversation } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        endpoint: '/conversations',
        paginate: {
            type: 'link',
            cursor_path_in_response: '_pagination.next',
            limit_name_in_request: 'limit',
            response_path: '_results',
            limit: 100
        },
        retries: 10
    };
    // https://dev.frontapp.com/reference/list-conversations
    for await (const conversations of nango.paginate<FrontConversation>(config)) {
        const mappedConversations = conversations.map((conversation: FrontConversation) => toConversation(conversation));
        await nango.batchSave<Conversation>(mappedConversations, 'Conversation');
    }
}
