import type { NangoSync, Conversation, ConversationMessage, ProxyConfiguration } from '../../models';
import { mapConversation, mapMessages } from '../mappers/to-conversation.js';
import type { IntercomConversationMessage, IntercomConversationsResponse } from '../types';

/**
 * Fetches Intercom conversations with all their associated messages and notes.
 *
 * This function fetches conversations updated within the last X years (or all conversations during initial sync)
 * and processes them using pagination.
 *
 * For endpoint documentation, refer to:
 * https://developers.intercom.com/docs/references/rest-api/api.intercom.io/conversations/retrieveconversation
 * @param nango - An instance of NangoSync for handling synchronization tasks.
 */
export default async function fetchData(nango: NangoSync): Promise<void> {
    const lastSyncDateTimestamp = nango.lastSyncDate ? nango.lastSyncDate.getTime() / 1000 : 0;
    const maxYearsToSync = 2;
    const maxSyncDate = new Date();
    maxSyncDate.setFullYear(new Date().getFullYear() - maxYearsToSync);
    const maxSyncDateTimestamp = maxSyncDate.getTime() / 1000;

    let finished = false;
    let nextPage = '';

    while (!finished) {
        const queryParams: Record<string, string> = {
            per_page: '100'
        };

        if (nextPage !== '') {
            queryParams['starting_after'] = nextPage;
        }

        const config: ProxyConfiguration = {
            endpoint: '/conversations',
            retries: 10,
            headers: {
                'Intercom-Version': '2.9'
            },
            params: queryParams
        };
        const ConversationResp = await nango.get<IntercomConversationsResponse>(config);

        const intercomConversationsPage: Conversation[] = [];
        const intercomMessagesPage: ConversationMessage[] = [];

        for (const conversation of ConversationResp.data.conversations) {
            if (conversation.updated_at < lastSyncDateTimestamp) {
                continue;
            }

            const conversationConfig: ProxyConfiguration = {
                endpoint: `/conversations/${conversation.id}`,
                retries: 10,
                headers: {
                    'Intercom-Version': '2.9'
                },
                params: { display_as: 'plaintext' }
            };

            const messageResp = await nango.get<IntercomConversationMessage>(conversationConfig);

            intercomConversationsPage.push(mapConversation(conversation));
            intercomMessagesPage.push(...mapMessages(messageResp.data));
        }

        await nango.batchSave(intercomConversationsPage, 'Conversation');
        await nango.batchSave(intercomMessagesPage, 'ConversationMessage');

        const lastConversation = ConversationResp.data.conversations.at(-1);

        if (
            !ConversationResp.data.pages.next ||
            (lastSyncDateTimestamp === 0 && lastConversation && lastConversation.updated_at <= maxSyncDateTimestamp) ||
            (lastSyncDateTimestamp > 0 && lastConversation && lastConversation.updated_at < lastSyncDateTimestamp)
        ) {
            finished = true;
        } else {
            nextPage = ConversationResp.data.pages.next.starting_after;
        }
    }
}
