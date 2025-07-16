import type { Conversation, ConversationMessage } from ../models.js;
import type { IntercomConversation, IntercomConversationMessage, Contact } from '../types.js';

/**
 * Maps raw conversation data from Intercom to Conversation model.
 *
 * @param conversationResp - The raw API response for a conversation.
 * @returns Conversation - Mapped conversation object.
 */
export function mapConversation(conversationResp: IntercomConversation): Conversation {
    return {
        id: conversationResp.id,
        created_at: new Date(conversationResp.created_at * 1000).toISOString(),
        updated_at: new Date(conversationResp.updated_at * 1000).toISOString(),
        waiting_since: conversationResp.waiting_since ? new Date(conversationResp.waiting_since * 1000).toISOString() : null,
        snoozed_until: conversationResp.snoozed_until ? new Date(conversationResp.snoozed_until * 1000).toISOString() : null,
        title: conversationResp.title,
        contacts: conversationResp.contacts.contacts.map((contact: Contact) => ({
            contact_id: contact.id
        })),
        state: conversationResp.state,
        open: conversationResp.open,
        read: conversationResp.read,
        priority: conversationResp.priority
    };
}

/**
 * Maps raw conversation message data from Intercom to ConversationMessage model.
 *
 * @param messageResp - The raw API response for a message.
 * @returns ConversationMessage[] - List of mapped message objects.
 */
export function mapMessages(messageResp: IntercomConversationMessage): ConversationMessage[] {
    const messages: ConversationMessage[] = [];

    messages.push({
        id: messageResp.source.id,
        conversation_id: messageResp.id,
        body: messageResp.source.body,
        type: 'comment',
        created_at: new Date(messageResp.created_at * 1000).toISOString(),
        updated_at: new Date(messageResp.updated_at * 1000).toISOString(),
        author: {
            type: mapAuthorType(messageResp.source.author.type),
            name: messageResp.source.author.name,
            id: messageResp.source.author.id
        }
    });

    for (const conversationPart of messageResp.conversation_parts.conversation_parts) {
        if (conversationPart.body === null) {
            continue;
        }

        messages.push({
            id: conversationPart.id,
            conversation_id: messageResp.id,
            body: conversationPart.body,
            type: mapMessagePartType(conversationPart.part_type),
            created_at: new Date(conversationPart.created_at * 1000).toISOString(),
            updated_at: new Date(conversationPart.updated_at * 1000).toISOString(),
            author: {
                type: mapAuthorType(conversationPart.author.type),
                name: conversationPart.author.name,
                id: conversationPart.author.id
            }
        });
    }

    return messages;
}

function mapMessagePartType(rawType: string): string {
    if (rawType === 'assignment') {
        return 'comment';
    }
    return rawType;
}

function mapAuthorType(rawType: string): string {
    if (rawType === 'team') {
        return 'admin';
    } else if (rawType === 'lead') {
        return 'user';
    }
    return rawType;
}
