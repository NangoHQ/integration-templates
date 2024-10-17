export interface CalendlyOrganizationMember {
    uri: string;
    role: string;
    user: CalendlyUser;
    organization: string;
    updated_at: string;
    created_at: string;
}

export interface CalendlyUser {
    uri: string;
    name: string;
    slug: string;
    email: string;
    scheduling_url: string;
    timezone: string;
    avatar_url: string;
    locale: string;
    created_at: string;
    updated_at: string;
}

export interface CalendlyCurrentUser {
    uri: string;
    name: string;
    slug: string;
    email: string;
    scheduling_url: string;
    timezone: string;
    avatar_url: string;
    created_at: string;
    updated_at: string;
    current_organization: string;
    resource_type: string;
    locale: string;
}
