export interface GorgiasTicketResponse {
    id: number;
    uri: string;
    external_id: string | null;
    events: [];
    status: 'open' | 'closed';
    priority: string;
    channel:
        | 'aircall'
        | 'api'
        | 'chat'
        | 'contact_form'
        | 'email'
        | 'facebook'
        | 'facebook-mention'
        | 'facebook-messenger'
        | 'facebook-recommendations'
        | 'help-center'
        | 'instagram-ad-comment'
        | 'instagram-comment'
        | 'instagram-direct-message'
        | 'instagram-mention'
        | 'internal-note'
        | 'phone'
        | 'sms'
        | 'twitter'
        | 'twitter-direct-message'
        | 'whatsapp'
        | 'yotpo-review';
    via:
        | 'aircall'
        | 'api'
        | 'chat'
        | 'contact_form'
        | 'email'
        | 'facebook'
        | 'facebook-mention'
        | 'facebook-messenger'
        | 'facebook-recommendations'
        | 'form'
        | 'gorgias_chat'
        | 'help-center'
        | 'helpdesk'
        | 'instagram'
        | 'instagram-ad-comment'
        | 'instagram-comment'
        | 'instagram-direct-message'
        | 'instagram-mention'
        | 'internal-note'
        | 'offline_capture'
        | 'phone'
        | 'rule'
        | 'self_service'
        | 'shopify'
        | 'sms'
        | 'twilio'
        | 'twitter'
        | 'twitter-direct-message'
        | 'whatsapp'
        | 'yotpo'
        | 'yotpo-review'
        | 'zendesk';
    from_agent: boolean;
    spam: boolean;
    customer: Customer;
    assignee_user: AssigneeUser | null;
    assignee_user_id: number;
    assignee_team: any | null;
    assignee_team_id: number | null;
    language: string;
    subject: string;
    excerpt: string;
    meta: any | null;
    tags: Tag[];
    integrations: [];
    messages_count: number;
    messages: GorgiasMessageResponse[];
    created_datetime: string;
    opened_datetime: string | null;
    last_received_message_datetime: string | null;
    last_message_datetime: string;
    updated_datetime: string;
    closed_datetime: string | null;
    trashed_datetime: string | null;
    snooze_datetime: string | null;
    satisfaction_survey: any | null;
    reply_options: ReplyOptions;
    requester?: Customer;
    is_unread: boolean;
}

interface Customer {
    id: number;
    email: string;
    name: string | null;
    firstname: string;
    lastname: string;
    meta: { name_set_via: string };
    channels: Channel[];
    data: any | null;
    customer: any | null;
    integrations: Record<string, any>;
    external_id: string | null;
    note: string | null;
    external_data: Record<string, any>;
    ecommerce_data: Record<string, any>;
}

interface AssigneeUser {
    id: number;
    email: string;
    name: string;
    firstname: string;
    lastname: string;
    meta: object | null;
    bio: string | null;
}

interface Tag {
    id: number;
    name: string;
    decoration: {
        color?: string;
    };
    created_datetime?: string | null;
    deleted_datetime?: string | null;
    uri?: string | null;
}

interface SenderReciever {
    id: number;
    email: string | null;
    name: string | null;
    meta: null;
    firstname: string;
    lastname: string;
}
export interface GorgiasMessageResponse {
    id: number;
    uri: string;
    message_id: string | null;
    ticket_id: number;
    external_id: string | null;
    public: boolean;
    channel:
        | 'aircall'
        | 'api'
        | 'chat'
        | 'contact_form'
        | 'email'
        | 'facebook'
        | 'facebook-mention'
        | 'facebook-messenger'
        | 'facebook-recommendations'
        | 'help-center'
        | 'instagram-ad-comment'
        | 'instagram-comment'
        | 'instagram-direct-message'
        | 'instagram-mention'
        | 'internal-note'
        | 'phone'
        | 'sms'
        | 'twitter'
        | 'twitter-direct-message'
        | 'whatsapp'
        | 'yotpo-review';
    via:
        | 'aircall'
        | 'api'
        | 'chat'
        | 'contact_form'
        | 'email'
        | 'facebook'
        | 'facebook-mention'
        | 'facebook-messenger'
        | 'facebook-recommendations'
        | 'form'
        | 'gorgias_chat'
        | 'help-center'
        | 'helpdesk'
        | 'instagram'
        | 'instagram-ad-comment'
        | 'instagram-comment'
        | 'instagram-direct-message'
        | 'instagram-mention'
        | 'internal-note'
        | 'offline_capture'
        | 'phone'
        | 'rule'
        | 'self_service'
        | 'shopify'
        | 'sms'
        | 'twilio'
        | 'twitter'
        | 'twitter-direct-message'
        | 'whatsapp'
        | 'yotpo'
        | 'yotpo-review'
        | 'zendesk';
    source: MessageSource;
    sender: SenderReciever;
    integration_id: number | null;
    intents: [];
    rule_id: number | null;
    from_agent: boolean;
    receiver: SenderReciever;
    subject: string;
    body_text: string;
    body_html: string;
    stripped_text: string;
    stripped_html: string;
    stripped_signature: string | null;
    attachments: GorgiasAttachementResponse[] | null;
    actions: MessageAction[];
    headers: null;
    meta: any | null;
    created_datetime: string;
    sent_datetime: string;
    failed_datetime: string;
    opened_datetime: string | null;
    last_sending_error: LastSendingError | null;
    is_retriable: boolean;
    deleted_datetime?: string | null;
    replied_by: string | null;
    replied_to: string | null;
    macros: [] | null;
}

export interface GorgiasAttachementResponse {
    url: string;
    name: string;
    size: number | null;
    content_type: string;
    public: boolean;
    extra: string;
}
interface MessageSource {
    type: 'email';
    to: { name: string; address: string }[];
    from: { name: string; address: string };
    extra: { include_thread: boolean };
}

interface MessageAction {
    name: string;
    type: string;
    title: string;
    status: string;
    arguments: {
        body_html: string;
        body_text: string;
    };
}

interface LastSendingError {
    error: string;
}

interface ReplyOptions {
    email: { answerable: boolean };
    'internal-note': { answerable: boolean };
}

interface Channel {
    id: number;
    type: 'email' | 'phone' | 'chat';
    address: string;
    preferred: boolean;
    created_datetime: string;
    updated_datetime: string;
    deleted_datetime: string | null;
    user: { id: number; name: string | null };
    customer: { id: number; name: string | null };
}
