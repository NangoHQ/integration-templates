export interface AttioWorkspaceMember {
    id: {
        workspace_id: string;
        workspace_member_id: string;
    };
    first_name: string;
    last_name: string;
    avatar_url?: string;
    email_address: string;
    created_at: string;
    access_level: string;
}

export interface AttioUserRecord {
    id: {
        workspace_id: string;
        object_id: string;
        record_id: string;
    };
    created_at: string;
    web_url: string;
    values: {
        person?: string;
        primary_email_address?: string;
        user_id?: string;
        workspace?: string;
        first_name?: string;
        last_name?: string;
        title?: string;
        phone?: string;
        mobile_phone?: string;
        department?: string;
        company?: string;
    };
}

export interface AttioOpportunityRecord {
    id: {
        workspace_id: string;
        object_id: string;
        record_id: string;
    };
    created_at: string;
    web_url: string;
    values: {
        name?: string;
        amount?: number;
        stage?: string;
        close_date?: string;
        owner?: string;
        probability?: number;
        type?: string;
        source?: string;
        description?: string;
    };
}

export interface AttioResponse<T> {
    data: T[];
}

export interface AttioObjectResponse {
    id: {
        workspace_id: string;
        object_id: string;
    };
    api_slug: string;
    singular_noun: string;
    plural_noun: string;
    created_at: string;
}
