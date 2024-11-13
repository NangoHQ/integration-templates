import type { NangoSync, Conversation, ProxyConfiguration } from '../../models';
import { toConversation } from '../mappers/toConversation.js';
import type { FrontConversation } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://dev.frontapp.com/reference/list-conversations
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
    for await (const conversations of nango.paginate<FrontConversation>(config)) {
        const mappedConversations = conversations.map((conversation: FrontConversation) => toConversation(conversation));
        await nango.batchSave<Conversation>(mappedConversations, 'Conversation');
    }
}
