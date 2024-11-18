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
    custom_fields: object;
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
    custom_fields: object;
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
    custom_fields: object;
    created_at: number;
    waiting_since: number;
    is_private: boolean;
    scheduled_reminders: ScheduledReminder[];
    metadata?: Metadata | undefined;
}

export interface SingleConversation {
    id: string;
}

export interface FrontMessages {
    id: string;
    version: string;
    created_at: number;
    subject: string;
    author: AuthorObj;
    recipients: RecipientsObj[];
    body: string;
    text: string;
    attachments?: AttachmentObj[];
    signature: {
        _links: {
            related: {
                owner: string;
            };
        };
        id: string;
        name: string;
        body: string;
        sender_info: string;
        is_visible_for_all_teammate_channels: boolean;
        is_default: boolean;
        is_private: boolean;
        channel_ids: string[];
    };
    metadata: {
        intercom_url: string;
        duration: number;
        have_been_answered: boolean;
        external_id: string;
        twitter_url: string;
        is_retweet: boolean;
        have_been_retweeted: boolean;
        have_been_favorited: boolean;
        thread_ref: string;
        headers: object;
        chat_visitor_url: string;
    };
}

interface LinkContact {
    _links: {
        related: {
            contact: string;
        };
    };
}

interface RecipientsObj {
    _links: LinkContact[];
    name: string;
    handle: string;
    role: 'from' | 'to' | 'cc' | 'bcc';
}

interface AttachmentObj {
    id: string;
    filename: string;
    url: string;
    content_type: string;
    size: number;
    metadata: {
        is_inline: boolean;
        cid: string;
    };
}

interface AuthorObj {
    _links: {
        self: string;
        related: {
            inboxes: string;
            conversations: string;
        };
    };
    id: string;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    is_admin: boolean;
    is_blocked: boolean;
    custom_fields: object;
}
