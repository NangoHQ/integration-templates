interface ArticleContent {
    type: string | null;
    title: string;
    description: string;
    body: string;
    author_id: number;
    state: string;
    created_at: number;
    updated_at: number;
    url: string;
}

interface TranslatedContent {
    type: string | null;
    ar: ArticleContent | null;
    bg: ArticleContent | null;
    bs: ArticleContent | null;
    ca: ArticleContent | null;
    cs: ArticleContent | null;
    da: ArticleContent | null;
    de: ArticleContent | null;
    el: ArticleContent | null;
    en: ArticleContent | null;
    es: ArticleContent | null;
    et: ArticleContent | null;
    fi: ArticleContent | null;
    fr: ArticleContent | null;
    he: ArticleContent | null;
    hr: ArticleContent | null;
    hu: ArticleContent | null;
    id: ArticleContent | null;
    it: ArticleContent | null;
    ja: ArticleContent | null;
    ko: ArticleContent | null;
    lt: ArticleContent | null;
    lv: ArticleContent | null;
    mn: ArticleContent | null;
    nb: ArticleContent | null;
    nl: ArticleContent | null;
    pl: ArticleContent | null;
    pt: ArticleContent | null;
    ro: ArticleContent | null;
    ru: ArticleContent | null;
    sl: ArticleContent | null;
    sr: ArticleContent | null;
    sv: ArticleContent | null;
    tr: ArticleContent | null;
    vi: ArticleContent | null;
    'pt-BR': ArticleContent | null;
    'zh-CN': ArticleContent | null;
    'zh-TW': ArticleContent | null;
}

export interface IntercomArticle {
    type: string;
    id: string;
    workspace_id: string;
    title: string;
    description: string | null;
    body: string | null;
    author_id: number;
    state: string;
    created_at: number;
    updated_at: number;
    url: string | null;
    parent_id: number | null;
    parent_ids: number[];
    parent_type: string | null;
    default_locale?: string;
    translated_content: TranslatedContent | null;
}

export interface IntercomContact {
    type: string;
    id: string;
    external_id: string | null;
    workspace_id: string;
    role: string;
    email: string;
    email_domain: string;
    phone: string | null;
    formatted_phone: string | null;
    name: string | null;
    owner_id: number | null;
    has_hard_bounced: boolean;
    marked_email_as_spam: boolean;
    unsubscribed_from_emails: boolean;
    created_at: number;
    updated_at: number;
    signed_up_at: number | null;
    last_seen_at: number | null;
    last_replied_at: number | null;
    last_contacted_at: number | null;
    last_email_opened_at: number | null;
    last_email_clicked_at: number | null;
    language_override: string | null;
    browser: string | null;
    browser_version: string | null;
    browser_language: string | null;
    os: string | null;
    android_app_name: string | null;
    android_app_version: string | null;
    android_device: string | null;
    android_os_version: string | null;
    android_sdk_version: string | null;
    android_last_seen_at: number | null;
    ios_app_name: string | null;
    ios_app_version: string | null;
    ios_device: string | null;
    ios_os_version: string | null;
    ios_sdk_version: string | null;
    ios_last_seen_at: number | null;
    custom_attributes: Record<string, any>;
    avatar: Avatar | null;
    tags: Tags | null;
    notes: Notes;
    companies: Companies;
    location: Location | null;
    social_profiles: SocialProfiles;
}

interface Avatar {
    type: string;
    image_url: string | null;
}

interface Tags {
    data: TagData[];
    url: string;
    total_count: number;
    has_more: boolean;
}

interface TagData {
    type: string;
    id: string;
    url: string;
}

interface Notes {
    data: NoteData[];
    url: string;
    total_count: number;
    has_more: boolean;
}

interface NoteData {
    type: string;
    id: string;
    url: string;
}

interface Companies {
    url: string;
    total_count: number;
    has_more: boolean;
}

interface Location {
    type: string | null;
    country: string | null;
    region: string | null;
    city: string | null;
}

interface SocialProfiles {
    data: SocialProfileData[];
}

interface SocialProfileData {
    type: string;
    name: string;
    url: string;
}

enum ConversationState {
    OPEN = 'open',
    CLOSED = 'closed',
    SNOOZED = 'snoozed'
}

enum ConversationPriority {
    PRIORITY = 'priority',
    NOT_PRIORITY = 'not_priority'
}

enum DeliveryMethod {
    CUSTOMER_INITIATED = 'customer_initiated',
    CAMPAIGNS_INITIATED = 'campaigns_initiated',
    OPERATOR_INITIATED = 'operator_initiated',
    AUTOMATED = 'automated',
    ADMIN_INITIATED = 'admin_initiated'
}

enum TagType {
    TAG = 'tag'
}

enum SLAStatus {
    HIT = 'hit',
    MISSED = 'missed',
    CANCELLED = 'cancelled',
    ACTIVE = 'active'
}

interface Teammate {
    type: 'contact';
    id: string | null;
}

interface Tag {
    type: TagType;
    id: string;
    name: string;
    applied_at: number;
    applied_by: Contact;
}

interface ConversationRating {
    rating: number;
    remark: string;
    created_at: number;
    contact: Contact;
    teammate: Teammate;
}

interface Attachment {
    type: string;
    name: string;
    url: string;
    content_type: string;
    filesize: number;
    width: number;
    height: number;
}

interface ConversationSource {
    type: 'conversation' | 'email' | 'facebook' | 'instagram' | 'phone_call' | 'phone_switch' | 'push' | 'sms' | 'twitter' | 'whatsapp';
    id: string;
    delivered_as: DeliveryMethod;
    subject: string;
    body: string;
    author: Author;
    attachments: Attachment[];
    url: string | null;
    redacted: boolean;
}

interface ConversationStatistics {
    type: 'conversation_statistics';
    time_to_assignment: number;
    time_to_admin_reply: number;
    time_to_first_close: number;
    time_to_last_close: number;
    median_time_to_reply: number;
    first_contact_reply_at: number;
    first_assignment_at: number;
    first_admin_reply_at: number;
    first_close_at: number;
    last_assignment_at: number;
    last_assignment_admin_reply_at: number;
    last_contact_reply_at: number;
    last_admin_reply_at: number;
    last_close_at: number;
    last_closed_by_id: string;
    count_reopens: number;
    count_assignments: number;
    count_conversation_parts: number;
}

interface SLAApplied {
    type: string;
    sla_name: string;
    sla_status: SLAStatus;
}

interface FirstContactReply {
    created_at: number;
    type: string | null;
    url: string | null;
}

interface TeammateList {
    type: 'admin.list';
    teammates: Teammate[] | null;
}

interface ConversationPartsResponse {
    type: 'conversation_part.list';
    conversation_parts: ConversationPart[];
    total_count: number;
}

interface ConversationPart {
    type: 'conversation_part';
    id: string;
    part_type: string;
    body: string | null;
    created_at: number;
    updated_at: number;
    notified_at: number;
    assigned_to: Reference | null;
    author: Author;
    attachments: Attachment[];
    external_id: string | null;
    redacted: boolean;
}

interface Reference {
    type: string;
    id: string | null;
}

interface Author {
    type: string;
    id: string;
    name: string;
    email: string;
}

export interface IntercomConversationMessage {
    type: 'conversation';
    id: string;
    title: string | null;
    created_at: number;
    updated_at: number;
    waiting_since: number | null;
    snoozed_until: number | null;
    open: boolean;
    state: ConversationState;
    read: boolean;
    priority: ConversationPriority;
    admin_assignee_id: number | null;
    team_assignee_id: string | null;
    tags: TagList;
    conversation_rating: ConversationRating | null;
    source: ConversationSource;
    contacts: Contacts;
    teammates: TeammateList | null;
    custom_attributes: object;
    first_contact_reply: FirstContactReply | null;
    sla_applied: SLAApplied | null;
    statistics: ConversationStatistics | null;
    conversation_parts: ConversationPartsResponse;
}

export interface Contact {
    type: 'contact';
    id: string;
    external_id: string | null;
}

interface Contacts {
    type: 'contact.list';
    contacts: Contact[];
}

interface TagList {
    type: 'tag.list';
    tags: Tag[];
}

interface LinkedObjects {
    type: 'list';
    data: any[];
    total_count: number;
    has_more: boolean;
}

export interface IntercomConversation {
    type: 'conversation';
    id: string;
    created_at: number;
    updated_at: number;
    waiting_since: number | null;
    snoozed_until: number | null;
    source: ConversationSource;
    contacts: Contacts;
    first_contact_reply: FirstContactReply | null;
    admin_assignee_id: string | null;
    team_assignee_id: string | null;
    open: boolean;
    state: ConversationState;
    read: boolean;
    tags: TagList;
    priority: ConversationPriority;
    sla_applied: SLAApplied | null;
    statistics: ConversationStatistics | null;
    conversation_rating: ConversationRating | null;
    teammates: TeammateList | null;
    title: string | null;
    custom_attributes: object;
    topics: object;
    ticket: string | null;
    linked_objects: LinkedObjects;
    ai_agent: string | null;
    ai_agent_participated: boolean;
}

interface IntercomNextPage {
    page: number;
    starting_after: string;
}

interface IntercomPages {
    type: 'pages';
    next?: IntercomNextPage;
    page: number;
    per_page: number;
    total_pages: number;
}

export interface IntercomConversationsResponse {
    type: 'conversation.list';
    pages: IntercomPages;
    total_count: number;
    conversations: IntercomConversation[];
}

export interface IntercomDeleteContactResponse {
    id: string;
    external_id?: string;
    type: 'contact';
    deleted: boolean;
}

export interface IntercomAdminUser {
    type: 'admin';
    email: string;
    id: string;
    name: string;
    away_mode_enabled: boolean;
    away_mode_reassign: boolean;
    has_inbox_seat: boolean;
    team_ids: string[];
    team_priority_level: unknown;
}

export interface WhoAmIResponse {
    type: 'admin';
    id: string;
    email: string;
    name: string;
    email_verified: boolean;
    app: {
        type: 'app';
        id_code: string;
        name: string;
        created_at: number;
        secure: boolean;
        identity_verification: boolean;
        timezone: string;
        region: string;
    };
    avatar: {
        type: 'avatar';
        image_url: string;
    };
    has_inbox_seat: boolean;
}
