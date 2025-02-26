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
        | 'yotpo-review'
        | string;
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
    assignee_user_id: number | null;
    assignee_team: object | null;
    assignee_team_id: number | null;
    language: string | null;
    subject: string | null;
    excerpt?: string;
    meta: any;
    tags: Tag[];
    integrations?: [];
    messages_count?: number;
    messages?: GorgiasMessageResponse[];
    created_datetime: string;
    opened_datetime: string | null;
    last_received_message_datetime: string | null;
    last_message_datetime: string;
    updated_datetime: string;
    closed_datetime: string | null;
    trashed_datetime: string | null;
    snooze_datetime: string | null;
    satisfaction_survey: any;
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
    data: object | null;
    customer: object | null;
    integrations: object;
    external_id: string | null;
    note: string | null;
    external_data?: Record<string, any>;
    ecommerce_data?: Record<string, any>;
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
    uri: string | null;
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
        | 'yotpo-review'
        | string;
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
    receiver: SenderReciever | null;
    subject: string | null;
    body_text: string | null;
    body_html: string | null;
    stripped_text: string | null;
    stripped_html: string | null;
    stripped_signature: string | null;
    attachments: GorgiasAttachementResponse[] | null;
    actions: MessageAction[];
    headers: null;
    meta: any;
    created_datetime: string;
    sent_datetime: string;
    failed_datetime: string;
    opened_datetime: string | null;
    last_sending_error: LastSendingError | null;
    is_retriable: boolean;
    deleted_datetime: string | null;
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
    type: string;
    to?: { name: string | null; address: string }[];
    cc?: { name: string | null; address: string }[];
    bcc?: { name: string | null; address: string };
    from?: { name: string | null; address: string };
    extra?: { include_thread: boolean };
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
    phone: { answerable: boolean };
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

export interface GorgiasCustomersResponse {
    id: number;
    external_id: string | null;
    active: boolean;
    email: string;
    name: string | null;
    firstname: string;
    lastname: string;
    language: string | null;
    timezone: string | null;
    created_datetime: string;
    updated_datetime: string;
    meta: object | null;
    data: object | null;
    customer: object | null;
    integrations: object;
    note: string | null;
    custom_fields: object;
}

export interface GorgiasCustomerResponse extends GorgiasCustomersResponse {
    channels: Channel[];
}

interface SatisfactionSurveyData {
    survey_interval: number;
    survey_email_html: string;
    survey_email_text: string;
    send_survey_for_chat: boolean;
    send_survey_for_email: boolean;
    send_survey_for_help_center: boolean;
    send_survey_for_contact_form: boolean;
}

interface BusinessHoursData {
    timezone: string;
    business_hours: {
        days: string;
        to_time: string;
        from_time: string;
    }[];
}

export interface TicketAssignmentData {
    unassign_on_reply: boolean;
    assignment_channels: string[];
    auto_assign_to_teams: boolean;
    max_user_chat_ticket: number;
    max_user_non_chat_ticket: number;
}

interface ViewsOrderingData {
    views: object;
    views_top: object;
    views_bottom: object;
    view_sections: object;
}

interface AccessData {
    signup_mode: string;
    allowed_domains: string[];
    google_sso_enabled: boolean;
    office365_sso_enabled: boolean;
}

interface ViewsVisibilityData {
    hidden_views: string[];
}

interface AutoMergeData {
    tickets: {
        enabled: boolean;
        merging_window_days: number;
    };
}

interface DefaultIntegrationData {
    email: number;
}

interface SettingsItem {
    id: number;
    type: string;
    data:
        | SatisfactionSurveyData
        | BusinessHoursData
        | TicketAssignmentData
        | ViewsOrderingData
        | AccessData
        | ViewsVisibilityData
        | AutoMergeData
        | DefaultIntegrationData;
}

export interface GorgiasSettingsResponse {
    data: SettingsItem[];
}
export interface GorgiasUserResponse {
    id: number;
    active: boolean;
    name: string;
    email: string;
    bio?: string | null;
    country?: string | null;
    external_id?: string;
    language?: string | null;
    firstname: string;
    lastname: string;
    meta?: Record<string, any>;
    role: {
        name: 'admin' | 'agent' | 'basic-agent' | 'lite-agent' | 'observer-agent' | 'bot';
    };
    created_datetime: string;
    updated_datetime: string | null;
    deactivated_datetime: string | null;
    timezone: string | null;
}
export interface GorgiasCreateUserReq {
    name: string;
    email: string;
    role: {
        name: 'admin' | 'agent' | 'basic-agent' | 'lite-agent' | 'observer-agent' | 'bot';
    };
}
