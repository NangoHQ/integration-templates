import { createSync } from "nango";
import { toConversation } from '../mappers/toConversation.js';
import type { FrontConversation } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { Conversation } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "List the conversations in the company in reverse chronological order.",
    version: "1.0.3",
    frequency: "every day",
    autoStart: true,
    syncType: "full",
    trackDeletes: true,

    endpoints: [{
        method: "GET",
        path: "/conversations",
        group: "Conversations"
    }],

    models: {
        Conversation: Conversation
    },

    metadata: z.object({}),

    exec: async nango => {
        const config: ProxyConfiguration = {
            // https://dev.frontapp.com/reference/list-conversations
            endpoint: '/conversations',
            paginate: {
                type: 'link',
                cursor_path_in_response: '_pagination.next',
                limit_name_in_request: 'limit',
                response_path: '_results',
                cursor_name_in_request: 'page_token',
                limit: 100
            },
            retries: 10
        };
        for await (const conversations of nango.paginate<FrontConversation>(config)) {
            const mappedConversations = conversations.map((conversation: FrontConversation) => toConversation(conversation));
            await nango.batchSave(mappedConversations, 'Conversation');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
