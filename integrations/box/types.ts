export interface BoxUser {
    id: string;
    type: 'user';
    address: string;
    avatar_url: string;
    can_see_managed_users: boolean;
    created_at: string;
    enterprise: {
        id: string;
        type: 'enterprise';
        name: string;
    };
    external_app_user_id: string;
    hostname: string;
    is_exempt_from_device_limits: boolean;
    is_exempt_from_login_verification: boolean;
    is_external_collab_restricted: boolean;
    is_platform_access_only: boolean;
    is_sync_enabled: boolean;
    job_title: string;
    language: string;
    login: string;
    max_upload_size: number;
    modified_at: string;
    name: string;
    my_tags: string[];
    notification_email: {
        email: string;
        is_confirmed: boolean;
    };
    phone: string;
    role: 'admin' | 'coadmin' | 'user';
    space_amount: number;
    space_used: number;
    status: 'active' | 'inactive' | 'cannot_delete_edit' | 'cannot_delete_edit_upload';
    timezone: string;
    tracking_codes?: TrackingCode[];
}

export interface TrackingCode {
    type: 'tracking_code';
    name: string;
    value: string;
}
