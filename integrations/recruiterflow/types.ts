export interface RecruiterFlowUserResponse {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    created_at: string;
    updated_at: string;
    is_active: boolean;
}

export interface RecruiterFlowCandidateResponse {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    current_stage?: string;
    current_job?: string;
    created_at: string;
    updated_at: string;
    source?: string;
    status: string;
    tags: string[];
    custom_fields: Record<string, any>;
}

export interface RecruiterFlowCandidateActivityResponse {
    id: string;
    candidate_id: string;
    activity_type: string;
    stage_from?: string;
    stage_to?: string;
    created_at: string;
    created_by: string;
    notes?: string;
}

export interface RecruiterFlowCandidateActivityTypeResponse {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface RecruiterFlowCandidateActivityListResponse {
    id: string;
    candidate_id: string;
    activity_type_id: string;
    created_at: string;
    created_by: string;
    notes?: string;
    metadata: Record<string, any>;
}

export interface RecruiterFlowCandidateScorecardResponse {
    id: string;
    candidate_id: string;
    job_id: string;
    created_at: string;
    created_by: string;
    scores: Record<string, number>;
    feedback?: string;
}

export interface RecruiterFlowJobResponse {
    id: string;
    title: string;
    department?: string;
    location?: string;
    employment_type?: string;
    status: string;
    remote_status?: string;
    created_at: string;
    updated_at: string;
    description?: string;
    requirements?: string;
    custom_fields: Record<string, any>;
}

export interface RecruiterFlowJobPipelineResponse {
    id: string;
    job_id: string;
    stages: string[];
    created_at: string;
    updated_at: string;
}

export interface RecruiterFlowJobStageResponse {
    id: string;
    name: string;
    job_id: string;
    order: number;
    created_at: string;
    updated_at: string;
}

export interface RecruiterFlowJobDepartmentResponse {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface RecruiterFlowJobStatusResponse {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface RecruiterFlowJobRemoteStatusResponse {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface RecruiterFlowLocationResponse {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface RecruiterFlowEmploymentTypeResponse {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface RecruiterFlowOrganizationLocationResponse {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    created_at: string;
    updated_at: string;
} 