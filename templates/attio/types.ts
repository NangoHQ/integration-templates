export interface AttioResponse<T> {
    data: T[];
}

interface AttributeObject {
    active_from: string;
    active_until: string | null;
    created_by_actor: {
        type: string;
        id: string | null;
    };
}

interface AttributeObjectWithValue extends AttributeObject {
    value: string;
    attribute_type: string;
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
        email_addresses?: {
            email_address: string;
            email_domain: string;
            email_root_domain: string;
            email_local_specifier: string;
        }[];
        phone_numbers?: {
            phone_number: string;
            country_code: string;
        }[];
        job_title?: AttributeObjectWithValue[];
        company?: {
            target_object: string;
            target_record_id: string;
        }[];
        description?: AttributeObject[];
        avatar_url?: AttributeObject[];
        linkedin?: {
            value: string;
        }[];
        twitter?: {
            value: string;
        }[];
        facebook?: {
            value: string;
        }[];
        instagram?: {
            value: string;
        }[];
        angellist?: {
            value: string;
        }[];
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
        name?: {
            value: string;
        }[];
        domains?: {
            domain: string;
            root_domain: string;
        }[];
        description?: {
            value: string;
        }[];
        team?: {
            target_object: string;
            target_record_id: string;
        }[];
        primary_location?: {
            country_code?: string;
            line_1?: string;
            line_2?: string;
            locality?: string;
            region?: string;
            postcode?: string;
            latitude?: string;
            longitude?: string;
        }[];
        categories?: {
            option: {
                title: string;
            };
        }[];
        logo_url?: {
            value: string;
        }[];
        twitter_follower_count?: {
            value: number;
        }[];
        foundation_date?: {
            value: string;
        }[];
        estimated_arr_usd?: {
            value: number;
        }[];
        linkedin?: {
            value: string;
        }[];
        twitter?: {
            value: string;
        }[];
        facebook?: {
            value: string;
        }[];
        instagram?: {
            value: string;
        }[];
        angellist?: {
            value: string;
        }[];
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
        name?: {
            value: string;
        }[];
        stage?: {
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
        }[];
        owner?: {
            referenced_actor_type: string;
            referenced_actor_id: string;
        }[];
        value?: {
            currency_value: number;
            currency_code: string;
        }[];
        associated_people?: {
            target_object: string;
            target_record_id: string;
        }[];
        associated_company?: {
            target_object: string;
            target_record_id: string;
        }[];
    };
}
