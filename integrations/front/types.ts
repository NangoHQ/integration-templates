interface Links {
    self: string;
    related?: RelatedLinks;
}

interface RelatedLinks {
    events?: string;
    followers?: string;
    messages?: string;
    comments?: string;
    inboxes?: string;
    last_message?: string;
    contact?: string;
    conversations?: string;
    owner?: string;
    parent_tag?: string;
    children?: string;
}

interface Assignee {
    _links: Links;
    id: string;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    is_admin: boolean;
    is_available: boolean;
    is_blocked: boolean;
    custom_fields: Object;
}

interface Recipient {
    _links: {
        related: {
            contact: string;
        };
    };
    name: string;
    handle: string;
    role: 'from' | 'to' | 'cc' | 'bcc';
}

interface Tag {
    _links: Links;
    id: string;
    name: string;
    description: string | null;
    highlight: string | null;
    is_private: boolean;
    is_visible_in_conversation_lists: boolean;
    created_at: number;
    updated_at: number;
}

interface Link {
    _links: {
        self: string;
    };
    id: string;
    name: string;
    type: string;
    external_url: string;
    custom_fields: Object;
}

interface ScheduledReminder {
    _links: {
        related: {
            owner: string;
        };
    };
    created_at: number;
    scheduled_at: number;
    updated_at: number;
}

interface Metadata {
    external_conversation_ids: string[];
}

export interface FrontConversation {
    _links: Links;
    id: string;
    subject: string;
    status: 'archived' | 'unassigned' | 'deleted' | 'assigned';
    assignee: Assignee;
    recipient: Recipient;
    tags: Tag[];
    links: Link[];
    custom_fields: Object;
    created_at: number;
    waiting_since: number;
    is_private: boolean;
    scheduled_reminders: ScheduledReminder[];
    metadata?: Metadata | undefined;
}
