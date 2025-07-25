export interface FreshdeskCategory {
    id: number;
    name: string;
    description: string;
    visible_in_portals?: number[];
    created_at: string;
    updated_at: string;
    icon?: object;
}

export interface FreshdeskFolder {
    id: number;
    name: string;
    description: string | null;
    articles_count: number;
    created_at: string;
    updated_at: string;
    icon_url?: string | null;
    parent_folder_id: number | null;
    sub_folders_count: number;
    hierarchy: HierarchyLevel[];
    visibility: number;
    company_ids?: number[];
    contact_segment_ids?: number[];
    company_segment_ids?: number[];
}

interface HierarchyLevel {
    level: number;
    type: string;
    data: HierarchyData;
}

interface HierarchyData {
    id: number;
    name: string;
    language: string;
}

interface SeoData {
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
}

export interface FreshdeskArticle {
    id: number;
    type: number;
    category_id: number;
    folder_id: number;
    hierarchy: HierarchyLevel[];
    thumbs_up: number;
    thumbs_down: number;
    hits: number;
    tags?: string[];
    seo_data: SeoData;
    agent_id: number;
    title: string;
    description: string;
    description_text: string;
    status: number;
    created_at: string;
    updated_at: string;
}

export interface FreshdeskContact {
    active: boolean;
    address?: string;
    avatar?: object;
    company_id?: number;
    view_all_tickets?: boolean;
    custom_fields?: Record<string, any>;
    deleted?: boolean;
    description?: string;
    email: string;
    id: number;
    job_title?: string;
    language?: string;
    mobile?: string;
    name: string;
    other_emails?: string[];
    phone?: string;
    tags?: string[];
    time_zone?: string;
    twitter_id?: string;
    unique_external_id?: string;
    other_companies?: Record<string, any>[];
    created_at: string;
    updated_at: string;
}

interface AgentContact {
    active: boolean;
    email: string;
    job_title: string | null;
    language: string;
    last_login_at: string | null;
    mobile: string | null;
    name: string;
    phone: string | null;
    time_zone: string;
    created_at: string;
    updated_at: string;
}

export interface FreshdeskAgent {
    available: boolean;
    occasional: boolean;
    id: number;
    ticket_scope: number;
    signature: string;
    group_ids: number[];
    role_ids: number[];
    skill_ids: number[];
    created_at: string;
    updated_at: string;
    available_since: string | null;
    type: string;
    contact: AgentContact;
    focus_mode: boolean;
}

interface CustomFields {
    category: string;
}

export interface FreshdeskTicket {
    cc_emails: string[];
    fwd_emails: string[];
    reply_cc_emails: string[];
    fr_escalated: boolean;
    spam: boolean;
    email_config_id: number | null;
    group_id: number;
    priority: number;
    requester_id: number;
    responder_id: number;
    source: number;
    status: number;
    subject: string;
    to_emails: string[] | null;
    product_id: number | null;
    id: number;
    type: string;
    created_at: string;
    updated_at: string;
    due_by: string;
    fr_due_by: string;
    is_escalated: boolean;
    custom_fields: CustomFields;
}
