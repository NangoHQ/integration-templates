import type { FrontConversation } from '../types.js';
import type { Conversation } from '../models.js';

export function toConversation(conversation: FrontConversation): Conversation {
    return {
        id: conversation.id,
        subject: conversation.subject,
        status: conversation.status,
        assignee: conversation.assignee
            ? {
                  id: conversation.assignee.id,
                  email: conversation.assignee.email,
                  first_name: conversation.assignee.first_name,
                  last_name: conversation.assignee.last_name,
                  is_admin: conversation.assignee.is_admin,
                  is_available: conversation.assignee.is_available,
                  is_blocked: conversation.assignee.is_blocked,
                  custom_fields: conversation.assignee.custom_fields
              }
            : null,
        recipient: conversation.recipient
            ? {
                  name: conversation.recipient.name,
                  handle: conversation.recipient.handle,
                  role: conversation.recipient.role
              }
            : null,
        tags: conversation.tags.map((tag) => ({
            id: tag.id,
            name: tag.name,
            description: tag.description,
            highlight: tag.highlight,
            is_private: tag.is_private,
            is_visible_in_conversation_lists: tag.is_visible_in_conversation_lists,
            created_at: new Date(tag.created_at * 1000).toISOString(),
            updated_at: new Date(tag.updated_at * 1000).toISOString()
        })),
        links: conversation.links.map((link) => ({
            id: link.id,
            name: link.name,
            type: link.type,
            external_url: link.external_url,
            custom_fields: link.custom_fields
        })),
        custom_fields: conversation.custom_fields,
        created_at: new Date(conversation.created_at * 1000).toISOString(),
        waiting_since: new Date(conversation.waiting_since * 1000).toISOString(),
        is_private: conversation.is_private,
        scheduled_reminders: conversation.scheduled_reminders.map((reminder) => ({
            created_at: new Date(reminder.created_at * 1000).toISOString(),
            scheduled_at: new Date(reminder.scheduled_at * 1000).toISOString(),
            updated_at: new Date(reminder.updated_at * 1000).toISOString()
        }))
    };
}
