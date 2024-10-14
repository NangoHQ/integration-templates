export interface ZendeskCategory {
    id: number;
    url: string;
    html_url: string;
    position: number;
    created_at: string;
    updated_at: string;
    name: string;
    description: string;
    locale: string;
    source_locale: string;
    outdated: boolean;
}

export interface ZendeskCategoriesResponse {
    categories: ZendeskCategory[];
    page: number;
    previous_page: number | null;
    next_page: number | null;
    per_page: number;
    page_count: number;
    count: number;
    sort_by: string;
    sort_order?: string; // Assuming sort order might be truncated in your input
}

export interface ZendeskSection {
    id: number;
    url: string;
    html_url: string;
    category_id: number;
    position: number;
    sorting: string;
    created_at: string;
    updated_at: string;
    name: string;
    description: string;
    locale: string;
    source_locale: string;
    outdated: boolean;
    parent_section_id: number | null;
    theme_template: string;
}

export interface ZendeskArticle {
    id: number;
    url: string;
    html_url: string;
    author_id: number;
    comments_disabled: boolean;
    draft: boolean;
    promoted: boolean;
    position: number;
    vote_sum: number;
    vote_count: number;
    section_id: number;
    created_at: string;
    updated_at: string;
    name: string;
    title: string;
    source_locale: string;
    locale: string;
    outdated: boolean;
    outdated_locales: string[];
    edited_at: string;
    user_segment_id: number | null;
    permission_group_id: number;
    content_tag_ids: number[];
    label_names: string[];
    body: string;
}

interface ViaSource {
    from: Record<string, unknown>;
    to: Record<string, unknown>;
    rel: string | null;
}

interface Via {
    channel: string;
    source: ViaSource;
}

interface CustomField {
    id: number;
    value: unknown | null;
}

interface SatisfactionRating {
    score: string;
}

export interface ZendeskTicket {
    url: string;
    id: number;
    external_id: string | null;
    via: Via;
    created_at: string;
    updated_at: string;
    generated_timestamp: number;
    type: string | null;
    subject: string;
    raw_subject: string;
    description: string;
    priority: string;
    status: string;
    recipient: string | null;
    requester_id: number;
    submitter_id: number;
    assignee_id: number;
    organization_id: number;
    group_id: number;
    collaborator_ids: number[];
    follower_ids: number[];
    email_cc_ids: number[];
    forum_topic_id: string | null;
    problem_id: string | null;
    has_incidents: boolean;
    is_public: boolean;
    due_at: string | null;
    tags: string[];
    custom_fields: CustomField[];
    satisfaction_rating: SatisfactionRating;
    sharing_agreement_ids: number[];
    custom_status_id: number;
    fields: CustomField[];
    followup_ids: number[];
    ticket_form_id: number;
    brand_id: number;
    allow_channelback: boolean;
    allow_attachments: boolean;
    from_messaging_channel: boolean;
}

interface SystemMetadata {
    client: string;
    ip_address: string;
    location: string;
    latitude: number;
    longitude: number;
}

interface Metadata {
    system: SystemMetadata;
    custom: Record<string, unknown>;
}

interface EventViaSource {
    from: {
        deleted: boolean;
        title: string;
        id: number;
    };
    rel: string | null;
}

interface EventVia {
    channel: string;
    source: EventViaSource;
}

interface Event {
    id: number;
    type: string;
    author_id: number;
    body?: string;
    html_body?: string;
    plain_body?: string;
    public?: boolean;
    attachments?: unknown[];
    audit_id: number;
    value?: string | number | null;
    field_name?: string;
    via?: EventVia;
    subject?: string;
    recipients?: number[];
}

interface Audit {
    id: number;
    ticket_id: number;
    created_at: string;
    author_id: number;
    metadata: Metadata;
    events: Event[];
    via: Via;
}

interface TicketAuditResponse {
    ticket: Ticket;
    audit: Audit;
}
