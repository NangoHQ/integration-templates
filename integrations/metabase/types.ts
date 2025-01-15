export interface MetabaseUser {
    email: string;
    first_name: string;
    locale: string | null;
    last_login: string | null;
    is_active: boolean;
    user_group_memberships: MetabaseGroupMembership[];
    is_qbnewb: boolean;
    updated_at: string;
    is_superuser: boolean;
    login_attributes: Record<string, string> | null;
    id: number;
    last_name: string;
    date_joined: string;
    sso_source: string | null;
    common_name: string | null;
}

export interface MetabaseGroupMembership {
    id: number;
    group_name?: string;
    is_group_manager?: boolean;
}

export interface MetabaseGroup {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    member_count: number;
}

export interface MetabaseCreateUserInput {
    first_name: string;
    last_name: string;
    email: string;
    user_group_memberships?: MetabaseGroupMembershipInput[];
    login_attributes?: Record<string, string>;
}

export interface MetabaseCreateUserOutput {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    active: boolean;
    created_at: string;
    updated_at: string;
}

export interface MetabaseUpdateUserInput {
    id: number;
    first_name?: string;
    last_name?: string;
    email?: string;
    is_group_manager?: boolean;
    user_group_memberships?: MetabaseGroupMembershipInput[];
}

export interface MetabaseUpdateUserOutput {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    active: boolean;
    created_at: string;
    updated_at: string;
}

export interface MetabaseDisableUserInput {
    id: number;
}

export interface MetabaseReactivateUserInput {
    id: number;
}

export interface MetabaseReactivateUserOutput {
    id: number;
    status: 'reactivated';
}

export interface MetabaseFetchUserInput {
    id: number;
}

export interface MetabaseFetchUsersInput {
    status?: 'active' | 'deactivated' | 'all';
    query?: string;
    group_id?: number;
    include_deactivated?: boolean;
    limit?: number;
    offset?: number;
}

export interface MetabaseFetchUsersOutput {
    users: MetabaseUser[];
}

export interface MetabaseUpdatePasswordInput {
    id: number;
    password: string;
    old_password?: string;
}

export interface MetabaseUpdatePasswordOutput {
    id: number;
    status: 'password_updated';
}

export interface MetabaseGroupMembershipInput {
    id: number;
    is_group_manager?: boolean;
}
