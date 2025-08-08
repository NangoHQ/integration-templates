import type {
    RecruiterFlowCandidateActivityListAssociatedEntities,
    RecruiterFlowCandidateActivityListCandidate,
    RecruiterFlowCandidateActivityListType
} from './models.js';

export interface RecruiterFlowJobResponse {
    apply_link: string;
    bill_rate?: {
        currency: string;
        frequency: {
            display_name: string;
            id: number;
            name: string;
        };
        number: string;
    };
    company: {
        id: number;
        img_link: string;
        name: string;
    };
    contract_end_date?: string;
    contract_start_date?: string;
    current_opening: number;
    custom_fields: {
        id: number;
        name: string;
        value: string | number;
    }[];
    department: string;
    employment_type: string;
    experience_range_end: number;
    experience_range_start: number;
    files: {
        file_id: number;
        filename: string;
        link: string;
        permission: number;
        source: string;
        upload_time: string | null;
    }[];
    hiring_team: {
        email: string;
        first_name: string;
        img_link: string;
        last_name: string;
        name: string;
        role: string;
        role_id: number;
        user_id: number;
    }[];
    id: number;
    is_open: boolean;
    job_status: {
        color: string;
        id: number;
        name: string;
    };
    job_type: {
        id: number;
        name: string;
    };
    job_visibility_id: number;
    locations: {
        city: string;
        country: string;
        id: number;
        iso_3166_1_alpha_2_code: string;
        name: string;
        postal_code: string;
        state: string | null;
        zipcode: string;
    }[];
    name: string;
    number_of_openings: number;
    pay_rate?: {
        currency: string;
        frequency: {
            display_name: string;
            id: number;
            name: string;
        };
        number: string;
    };
    publish_to_careers_page: boolean;
    salary_frequency: string;
    salary_range_currency: string;
    salary_range_end: number;
    salary_range_start: number;
    title: string;
    work_quantum?: {
        frequency: {
            display_name: string;
            id: number;
            name: string;
        };
        is_full_time: boolean;
        number: string;
        unit: {
            display_name: string;
            id: number;
            name: string;
        };
    };
    expected_salary?: {
        currency: string;
        number: number;
    };
    expected_fee?: {
        currency: string;
        number: number;
    };
    commission_rate?: number;
    expected_start_date?: string;
    expected_end_date?: string;
}

export interface RecruiterFlowUserResponse {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    middle_name: string | undefined;
    name: string;
    role: { name: string; id: number }[];
    img_link: string | undefined;
}

export interface RecruiterFlowCandidateResponse {
    added_by: {
        id: number;
        img_link: string;
        name: string;
    };
    added_time: string;
    angellist_profile: string | null;
    behance_profile: string | null;
    client: any;
    client_company_id: number | null;
    current_designation: string | null;
    current_organization: string | null;
    custom_fields: {
        id: number;
        name: string;
        value: string | number;
    }[];
    do_not_email: boolean;
    dribbble_profile: string | null;
    education: unknown[];
    email: string[];
    experience: unknown[];
    facebook_profile: string | null;
    files: {
        filename: string;
        id: number;
        link: string;
        permission: number;
        upload_time: string;
    }[];
    first_name: string;
    github_profile: string | null;
    id: number;
    img_link: string;
    jobs: {
        added_to_job_by: {
            id: number;
            name: string;
        };
        client_company_id: number;
        client_company_name: string;
        department_name: string;
        disqualification_reason: string;
        is_open: boolean;
        job_id: number;
        job_visibility_id: number;
        name: string;
        stage_moved: string;
        stage_name: string;
        starred: number;
    }[];
    last_contact_type: string | null;
    last_contacted: string | null;
    last_engaged: string | null;
    last_engagement_type: string | null;
    last_name: string;
    latest_activity_time: string;
    lead_owner: {
        id: number;
        img_link: string;
        name: string;
    };
    linkedin_profile: string | null;
    location: {
        city: string;
        country: string;
        google_place_id: string;
        location: string;
        postal_code: string;
        state: string;
        street_address_1: string;
        street_address_2: string;
    };
    name: string;
    notes: unknown[];
    phone_number: string[];
    prospect_id: number;
    prospect_type_id: number;
    skills: unknown[];
    source_name: string;
    status: {
        id: number | null;
        name: string | null;
    };
    submission_times: unknown[];
    tags: unknown[];
    twitter_profile: string | null;
    upcoming_activities: Record<string, unknown>;
    xing_profile: string | null;
}

export interface RecruiterFlowCandidateActivityResponse {
    id: number;
    candidate_id: string;
    activity_type: string;
    stage_from?: string;
    stage_to?: string;
    created_at: string;
    created_by: string;
    notes?: string;
}

export interface RecruiterFlowJobDepartmentResponse {
    id: string;
    name: string;
    count: number;
}

export interface RecruiterFlowJobStatusResponse {
    id: number;
    name: string;
    color: string;
}

export interface RecruiterFlowJobRemoteStatusResponse {
    id: number;
    name: string;
}

export interface RecruiterFlowLocationResponse {
    id: number;
    name: string;
    city: string | null;
    country: string | null;
    details: string | null;
    iso_3166_1_alpha_2_code: string | null;
    location_type: string;
    location_type_id: number;
    postal_code: string | null;
    state: string | null;
    zipcode: string | null;
}

export interface RecruiterFlowEmploymentTypeResponse {
    id: number;
    name: string;
}

export interface RecruiterFlowOrganizationLocationResponse {
    id: number;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
}

export interface RecruiterFlowCandidateFullActivityResponse {
    activity_id: number;
    associated_entities?: RecruiterFlowCandidateActivityListAssociatedEntities | undefined;
    candidate_id: number;
    contact_id: number | null;
    interview_plan_id: number | null;
    is_custom: boolean;
    job_id: number;
    subject: string;
    text: string;
    time: string;
    type: RecruiterFlowCandidateActivityListType;
    user: RecruiterFlowCandidateActivityListCandidate;
}
