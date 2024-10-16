export interface ZoomCreatedUser {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    type: number;
    zoom_workplace: number;
    on_prem: boolean;
}

export interface ZoomUser extends ZoomCreatedUser {
    display_name: string;
    pmi: number;
    timezone: string;
    verified: number;
    dept: string;
    created_at: string;
    last_login_time: string;
    pic_url: string;
    language: string;
    phone_number: string;
    status: string;
    role_id: string;
    user_created_at: string;
}

export interface ZoomMeeting {
    uuid: string;
    id: number;
    host_id: string;
    topic: string;
    type: number;
    start_time: string;
    duration: number;
    timezone: string;
    created_at: string;
    join_url: string;
}

interface ZoomMeetingSettings {
    host_video: boolean;
    participant_video: boolean;
    cn_meeting: boolean;
    in_meeting: boolean;
    join_before_host: boolean;
    jbh_time: number;
    mute_upon_entry: boolean;
    watermark: boolean;
    use_pmi: boolean;
    approval_type: number;
    audio: 'both' | 'telephony' | 'voip' | 'thirdParty';
    auto_recording: 'local' | 'cloud' | 'none';
    enforce_login: boolean;
    enforce_login_domains: string;
    alternative_hosts: string;
    alternative_host_update_polls: boolean;
    close_registration: boolean;
    show_share_button: boolean;
    allow_multiple_devices: boolean;
    registrants_confirmation_email: boolean;
    waiting_room: boolean;
    request_permission_to_unmute_participants: boolean;
    registrants_email_notification: boolean;
    meeting_authentication: boolean;
    encryption_type: 'enhanced_encryption' | 'e2ee';
    approved_or_denied_countries_or_regions: { enable: boolean };
    breakout_room: { enable: boolean };
    internal_meeting: boolean;
    continuous_meeting_chat: {
        enable: boolean;
        auto_add_invited_external_users: boolean;
        channel_id: string;
    };
    participant_focused_meeting: boolean;
    push_change_to_calendar: boolean;
    resources: any[]; // You may want to define the type for resources if it's known
    auto_start_meeting_summary: boolean;
    auto_start_ai_companion_questions: boolean;
    alternative_hosts_email_notification: boolean;
    show_join_info: boolean;
    device_testing: boolean;
    focus_mode: boolean;
    meeting_invitees: any[]; // Define type if known
    enable_dedicated_group_chat: boolean;
    private_meeting: boolean;
    email_notification: boolean;
    host_save_video_order: boolean;
    sign_language_interpretation: { enable: boolean };
    email_in_attendee_report: boolean;
}

export interface ZoomCreatedMeeting {
    uuid: string;
    id: number;
    host_id: string;
    host_email: string;
    topic: string;
    type: number;
    status: string;
    start_time: string;
    duration: number;
    timezone: string;
    agenda: string;
    created_at: string;
    start_url: string;
    join_url: string;
    settings: ZoomMeetingSettings;
    pre_schedule: boolean;
}
