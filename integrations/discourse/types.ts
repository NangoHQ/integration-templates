export interface DiscourseUser {
    id: number;
    username: string;
    name: string;
    avatar_template: string;
    email: string;
    secondary_emails: (string | null)[];
    active: boolean;
    admin: boolean;
    moderator: boolean;
    last_seen_at: string;
    last_emailed_at: string;
    created_at: string;
    last_seen_age: number;
    last_emailed_age: number;
    created_at_age: number;
    trust_level: number;
    manual_locked_trust_level: string;
    title: string;
    time_read: number;
    staged: boolean;
    days_visited: number;
    posts_read_count: number;
    topics_entered: number;
    post_count: number;
}

export interface Category {
    id: number;
    name: string;
    color: string;
    text_color: string;
    slug: string;
    topic_count: number;
    post_count: number;
    position: number;
    description: string | null;
    description_text: string | null;
    description_excerpt: string | null;
    topic_url: string;
    read_restricted: boolean;
    permission: object;
    notification_level: number;
    can_edit: boolean;
    topic_template: string | null;
    has_children: boolean | null;
    subcategory_count: number | null;
    sort_order: string | null;
    sort_ascending: boolean | null;
    show_subcategory_list: boolean;
    num_featured_topics: number;
    default_view: string | null;
    subcategory_list_style: string;
    default_top_period: string;
    default_list_filter: string;
    minimum_required_tags: number;
    navigate_to_first_post_after_read: boolean;
    custom_fields: Record<string, any>;
    allowed_tags: string[];
    allowed_tag_groups: string[];
    allow_global_tags: boolean;
    read_only_banner: string | null;
    form_template_ids: string[];
    available_groups: string[];
    auto_close_hours: number | null;
    auto_close_based_on_last_post: boolean;
    group_permissions: object[];
    email_in: string | null;
    email_in_allow_strangers: boolean;
    mailinglist_mirror: boolean;
    all_topics_wiki: boolean;
    allow_unlimited_owner_edits_on_first_post: boolean;
    can_delete: boolean;
    allow_badges: boolean;
    topic_featured_link_allowed: boolean;
    search_priority: number;
    default_slow_mode_seconds: number | null;
    uploaded_logo: string | null;
    uploaded_logo_dark: string | null;
    uploaded_background: string | null;
    uploaded_background_dark: string | null;
    required_tag_groups: string[];
    category_setting: CategorySetting;
}

interface CategorySetting {
    auto_bump_cooldown_days: number;
    num_auto_bump_daily: number;
    require_reply_approval: boolean;
    require_topic_approval: boolean;
}

export interface CategoryResponse {
    category_list: {
        can_create_category: boolean;
        can_create_topic: boolean;
        categories: Category[];
    };
}

interface ActionSummary {
    id: number;
    can_act: boolean;
}

export interface Post {
    id: number;
    name: string;
    username: string;
    avatar_template: string;
    created_at: string;
    cooked: string;
    post_number: number;
    post_type: number;
    updated_at: string;
    reply_count: number;
    reply_to_post_number: number | null;
    quote_count: number;
    incoming_link_count: number;
    reads: number;
    readers_count: number;
    score: number;
    yours: boolean;
    topic_id: number;
    topic_slug: string;
    display_username: string;
    primary_group_name: string | null;
    flair_name: string | null;
    flair_url: string | null;
    flair_bg_color: string | null;
    flair_color: string | null;
    flair_group_id: number | null;
    version: number;
    can_edit: boolean;
    can_delete: boolean;
    can_recover: boolean;
    can_see_hidden_post: boolean;
    can_wiki: boolean;
    user_title: string | null;
    bookmarked: boolean;
    raw: string;
    actions_summary: ActionSummary[];
    moderator: boolean;
    admin: boolean;
    staff: boolean;
    user_id: number;
    draft_sequence: number;
    hidden: boolean;
    trust_level: number;
    deleted_at: string | null;
    user_deleted: boolean;
    edit_reason: string | null;
    can_view_edit_history: boolean;
    wiki: boolean;
    reviewable_id: number | null;
    reviewable_score_count: number;
    reviewable_score_pending_count: number;
    akismet_state: string | null;
    user_cakedate: string;
    can_accept_answer: boolean;
    can_unaccept_answer: boolean;
    accepted_answer: boolean;
    topic_accepted_answer: boolean;
}
