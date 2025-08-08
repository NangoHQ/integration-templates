import { createSync } from 'nango';
import { mapConversation, mapMessages } from '../mappers/to-conversation.js';
import type { IntercomConversationMessage, IntercomConversationsResponse } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { Conversation, ConversationMessage } from '../models.js';
import { z } from 'zod';

/**
 * Fetches Intercom conversations with all their associated messages and notes.
 *
 * Note that Intercom has a hard limit of 500 message parts (messages/notes/actions etc.) returned per conversation.
 * If a conversation has more than 500 parts some will be missing.
 * Only fetches parts that have a message body, ignores parts which are pure actions & metadata (e.g. closed conversation).
 *
 * Initial sync: Fetches conversations updated in the last X years (default: X=2)
 * Incremential sync: Fetches the conversations that have been updates since the last sync (updated_at date from Intercom, seems to be reliable)
 *
 * For endpoint documentation, refer to:
 * https://developers.intercom.com/docs/references/rest-api/api.intercom.io/conversations/retrieveconversation
 * @param nango - An instance of NangoSync for handling synchronization tasks.
 */
const sync = createSync({
    description: 'Fetches a list of conversations from Intercom',
    version: '2.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/conversations'
        },
        {
            method: 'GET',
            path: '/conversation-messages'
        }
    ],

    models: {
        Conversation: Conversation,
        ConversationMessage: ConversationMessage
    },

    metadata: z.object({}),

    exec: async (nango) => {
        // Intercom uses unix timestamp for datetimes.
        // Convert the last sync run date into a unix timestamp for easier comparison.
        const lastSyncDateTimestamp = nango.lastSyncDate ? nango.lastSyncDate.getTime() / 1000 : 0;
        const maxYearsToSync = 2;
        const maxSyncDate = new Date();
        maxSyncDate.setFullYear(new Date().getFullYear() - maxYearsToSync);
        const maxSyncDateTimestamp = maxSyncDate.getTime() / 1000;

        // Get the list of conversations
        // Not documented, but from testing it seems the list is sorted by updated_at DESC
        // https://developers.intercom.com/intercom-api-reference/reference/listconversations
        let finished = false;
        let nextPage = '';

        while (!finished) {
            // This API endpoint has an annoying bug: If you pass "starting_after" with no value you get a 500 server error
            // Because of this we only set it here when we are fetching page >= 2, otherwise we don't pass it.
            const queryParams: Record<string, string> = {
                per_page: '100'
            };

            if (nextPage !== '') {
                queryParams['starting_after'] = nextPage;
            }

            const config: ProxyConfiguration = {
                // https://developers.intercom.com/intercom-api-reference/reference/listconversations
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
                    // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/conversations/retrieveconversation
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

            const lastConversation = ConversationResp.data.conversations[ConversationResp.data.conversations.length - 1];

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
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
