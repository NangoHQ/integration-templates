export interface EmailEntity {
    email: string;
}

export interface SuccessResponse {
    success: boolean;
}

export interface User {
    id: number | null;
    email: string[] | null;
    firstName: string | null;
    lastName: string | null;
}

export type GroupRole = 'admin' | 'operator' | 'supervisor';

export type GroupType =
    | 'callcenter'
    | 'callrouter'
    | 'channel'
    | 'coachinggroup'
    | 'coachingteam'
    | 'department'
    | 'office'
    | 'room'
    | 'staffgroup'
    | 'unknown'
    | 'user';

export interface GroupDetail {
    do_not_disturb?: boolean | null;
    group_id?: number | null;
    group_type?: GroupType | null;
    role?: GroupRole | null;
}

export interface DialpadUser {
    admin_office_ids: number[] | null;
    company_id: number | null;
    country: string | null;
    date_active: Date | null;
    date_added: Date | null;
    date_first_login: Date | null;
    do_not_disturb: boolean | null;
    duty_status_reason: string | null;
    duty_status_started: Date | null;
    emails: string[] | null;
    extension: string | null;
    first_name: string | null;
    forwarding_numbers: string[] | null;
    group_details: GroupDetail[] | null;
    id: number | null;
    image_url: string | null;
    is_admin: boolean | null;
    is_available: boolean | null;
    is_on_duty: boolean | null;
    is_online: boolean | null;
    is_super_admin: boolean | null;
    job_title: string | null;
    language: string | null;
    last_name: string | null;
    license: string | null;
    location: string | null;
    muted: boolean | null;
    office_id: number | null;
    on_duty_started: Date | null;
    on_duty_status: string | null;
    phone_numbers: string[] | null;
    state: string | null;
    status_message: string | null;
    timezone: string | null;
}

export interface CreateUser {
    firstName: string;
    lastName: string;
    email: string;
}

export interface DialpadCreateUser extends CreateUser {
    license?: string;
    officeId?: string;
    autoAssign?: boolean;
}

export interface UserListParams {
    cursor?: string;
    state?: 'active' | 'all' | 'cancelled' | 'suspended' | 'deleted' | 'pending';
    company_admin?: boolean;
    limit?: number;
    email?: string;
    number?: string;
}
