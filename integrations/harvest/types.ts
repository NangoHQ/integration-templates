export interface HarvestUser {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    telephone: string;
    timezone: string;
    has_access_to_all_future_projects: boolean;
    is_contractor: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    weekly_capacity: number;
    default_hourly_rate: number;
    cost_rate: number;
    roles: string[];
    access_roles: string[];
    avatar_url: string;
}
