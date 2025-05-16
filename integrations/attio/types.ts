export interface AttioResponse<T> {
    data: T[];
}

export interface AttioPersonResponse {
    id: {
        workspace_id: string;
        object_id: string;
        record_id: string;
    };
    created_at: string;
    web_url: string;
    values: {
        name?: {
            first_name?: string;
            last_name?: string;
            full_name?: string;
        };
        email_addresses?: Array<{
            email_address: string;
            email_domain: string;
            email_root_domain: string;
            email_local_specifier: string;
        }>;
        phone_numbers?: Array<{
            phone_number: string;
            country_code: string;
        }>;
        job_title?: string;
        company?: {
            target_object: string;
            target_record_id: string;
        };
        description?: string;
        avatar_url?: string;
        linkedin?: string;
        twitter?: string;
        facebook?: string;
        instagram?: string;
        angellist?: string;
        primary_location?: {
            line_1?: string;
            line_2?: string;
            locality?: string;
            region?: string;
            postcode?: string;
            country_code?: string;
        };
    };
}

export interface AttioCompanyResponse {
    id: {
        workspace_id: string;
        object_id: string;
        record_id: string;
    };
    created_at: string;
    web_url: string;
    values: {
        name?: Array<{
            value: string;
        }>;
        domains?: Array<{
            domain: string;
            root_domain: string;
        }>;
        description?: Array<{
            value: string;
        }>;
        team?: Array<{
            target_object: string;
            target_record_id: string;
        }>;
        primary_location?: Array<{
            country_code?: string;
            line_1?: string;
            line_2?: string;
            locality?: string;
            region?: string;
            postcode?: string;
            latitude?: string;
            longitude?: string;
        }>;
        categories?: Array<{
            option: {
                title: string;
            };
        }>;
        logo_url?: Array<{
            value: string;
        }>;
        twitter_follower_count?: Array<{
            value: number;
        }>;
        foundation_date?: Array<{
            value: string;
        }>;
        estimated_arr_usd?: Array<{
            value: number;
        }>;
        linkedin?: Array<{
            value: string;
        }>;
        twitter?: Array<{
            value: string;
        }>;
        facebook?: Array<{
            value: string;
        }>;
        instagram?: Array<{
            value: string;
        }>;
        angellist?: Array<{
            value: string;
        }>;
    };
}

export interface AttioDealResponse {
    id: {
        workspace_id: string;
        object_id: string;
        record_id: string;
    };
    created_at: string;
    web_url: string;
    values: {
        name?: Array<{
            value: string;
        }>;
        stage?: Array<{
            status: {
                title: string;
                id: {
                    workspace_id: string;
                    object_id: string;
                    attribute_id: string;
                    status_id: string;
                };
                is_archived: boolean;
                celebration_enabled: boolean;
                target_time_in_status: string | null;
            };
        }>;
        owner?: Array<{
            referenced_actor_type: string;
            referenced_actor_id: string;
        }>;
        value?: Array<{
            currency_value: number;
            currency_code: string;
        }>;
        associated_people?: Array<{
            target_object: string;
            target_record_id: string;
        }>;
        associated_company?: Array<{
            target_object: string;
            target_record_id: string;
        }>;
    };
}
