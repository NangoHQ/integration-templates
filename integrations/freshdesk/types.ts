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

export interface FreshdeskUser {
    id: number;
    name: string;
    email: string;
    address?: string;
    description?: string;
    job_title?: string;
    twitter_id?: string;
    fb_profile_id?: string;
    phone?: number;
    mobile?: number;
    language?: string;
    time_zone?: string;
    customer_id?: number;
    deleted?: boolean;
    helpdesk_agent: boolean;
    active: boolean;
    external_id: number;
    avatar_attributes?: {
        content: object;
    };
    custom_field?: {
        [key: string]: any;
    };
}
