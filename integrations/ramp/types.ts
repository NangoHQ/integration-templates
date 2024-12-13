export interface CustomField {
    name?: string;
    value?: string;
}

export interface RampUserListResponse {
    business_id: string | null;
    custom_fields: CustomField[];
    department_id: string | null;
    entity_id: string | null;
    location_id: string | null;
    manager_id: string | null;
    email?: string;
    employee_id?: string;
    first_name?: string;
    id?: string;
    is_manager?: boolean;
    last_name?: string;
    phone?: string;
    role?: 'Admin' | 'Cardholder' | 'Owner' | 'Bookkeeper';
    status?: 'INVITE_DELETED' | 'INVITE_EXPIRED' | 'INVITE_PENDING' | 'USER_ACTIVE' | 'USER_INACTIVE' | 'USER_ONBOARDING' | 'USER_SUSPENDED';
}

export interface RampCreatedUser {
    id: string;
}
