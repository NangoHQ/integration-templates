export interface GemErrorResponse {
    code: number;
    status: string;
    message: string;
    errors: {
        [key: string]: Record<string, any>;
    };
}

interface GemPagination {
    page?: number; // Default: 1
    per_page?: number; // [ 1 .. 500 ] Default: 100
}

type GemEmail = {
    email_address: string;
    is_primary: boolean;
};

type GemEducationInfo = {
    school: string | null;
    parsed_university: string | null;
    parsed_school: string | null;
    start_date: string | null;
    end_date: string | null;
    field_of_study: string | null;
    parsed_major_1: string | null;
    parsed_major_2: string | null;
    degree: string | null;
};

type GemWorkInfo = {
    company: string | null;
    title: string | null;
    work_start_date: string | null;
    work_end_date: string | null;
    is_current: boolean | null;
};

type GemCustomFieldCandidateMembership = {
    id: string; // ObjectID
    // The name of the custom field is unique in its scope. Any leading and trailing spaces of the name string will be removed.
    name: string;
    // Custom fields under team scope apply to all candidates. Custom fields under project scope apply to candidates in a specific project.
    scope: 'team' | 'project';
    // Applicable and required when scope is project. If the custom field has project scope, this is the project ID that its associated with.
    project_id?: string; // ObjectID
    value: any; // Custom Field Value
    value_type: 'date' | 'text' | 'single_select' | 'multi_select';
    // When value_type is text, value is a string. When value_type is date, value is a string of format yyyy-mm-dd.
    // When value_type is single_select, value is a string of an option value.
    // When value_type is multi_select, value is an array of strings of option values.
    value_option_ids?: string[]; // Array of ObjectIDs
    // Deprecated: same as name. Will be dropped in future versions.
    custom_field_category?: string;
    // Deprecated: same as value. Will be dropped in future versions.
    custom_field_value?: any; // Custom Field Value
};

/**
 * Candidate
 */

// https://api.gem.com/ats/v0/reference#tag/Candidate/paths/~1ats~1v0~1candidates~1/get
export type GemListCandidatesParams = {
    created_after?: string;
    created_before?: string;
    updated_before?: string;
    updated_after?: string;
    job_id?: string;
    email?: string;
    candidate_ids?: string[];
    include_deleted?: 'true' | 'false';
} & GemPagination;

interface GemFile {
    filename: string;
    url: string;
    type: 'resume' | string;
    created_at: string; // date-time format
}

interface GemPhoneNumber {
    type: string;
    value: string;
}

interface GemEmailAddress {
    type: string;
    value: string;
    is_primary: boolean;
}

interface GemSocialMediaAddress {
    value: string;
}

interface GemEducation {
    id: string;
    school_name: string;
    degree: string;
    discipline: string;
    start_date: string; // date format
    end_date: string; // date format
}

interface GemWork {
    id: string;
    company_name: string;
    title: string;
    start_date: string; // date format
    end_date: string; // date format
}

export type GemCandidate = {
    id: string;
    first_name: string;
    last_name: string;
    company: string | null;
    title: string | null;
    attachments: GemFile[];
    phone_numbers: GemPhoneNumber[];
    email_addresses: GemEmailAddress[];
    social_media_addresses: GemSocialMediaAddress[];
    tags: string[];
    educations: GemEducation[];
    employments: GemWork[];
    linked_user_ids: string[];
    created_at: string; // date-time format
    updated_at: string | null; // date-time format
    last_activity: string | null; // date-time format
    deleted_at?: string; // date-time format
    is_private: boolean;
    applications: GemApplication[];
    application_ids: string[];
};

// https://api.gem.com/v0/reference#tag/Candidates/paths/~1v0~1candidates/post
export type GemCreateCandidateParams = {
    created_by: string; // ObjectID
    first_name: string | null; // <= 255 characters
    last_name: string | null; // <= 255 characters
    nickname?: string | null; // <= 255 characters
    emails: GemEmail[];
    linked_in_handle?: string | null; // <= 255 characters
    title?: string | null; // <= 255 characters
    company?: string | null; // <= 255 characters
    location?: string | null; // <= 255 characters
    school?: string | null; // <= 255 characters
    education_info?: GemEducationInfo[];
    work_info?: GemWorkInfo[];
    profile_urls?: Array<string> | null;
    custom_fields?: GemCustomFieldCandidateMembership[];
    phone_number?: string | null; // <= 255 characters
    // If project_ids is provided with an array of project ids, the candidate will be added into the projects once they are created.
    project_ids?: Array<string> | null; // ObjectID <= 20 items
    sourced_from?: 'SeekOut' | 'hireEZ' | 'Starcircle' | 'Censia' | 'Consider' | null;
    // Requires linked_in_handle to be non-null. Attempts to fill in any missing fields.
    autofill?: boolean; // Default: false
};

interface GemDeprecatedApplicationAttachment {
    filename: string;
    type: 'resume' | string;
    content: string;
    content_type: string;
}
interface GemDeprecatedUserIdentifier {
    user_id: string;
    email: string;
}

// That endpoint is deprecated, but works
// https://api.gem.com/ats/v0/reference#tag/Candidate/paths/~1ats~1v0~1candidates~1/post
export interface GemDeprecatedCreateCandidateParams {
    first_name: string;
    last_name: string;
    phone_number?: string;
    email: string;
    title?: string;
    company?: string;
    job_id: string;
    initial_stage_id?: string;
    source_id?: string;
    recruiter?: GemDeprecatedUserIdentifier;
    coordinator?: GemDeprecatedUserIdentifier;
    sourcer?: GemDeprecatedUserIdentifier;
    linkedin_handle?: string;
    attachments?: GemDeprecatedApplicationAttachment[];
}

// Upload a resume to a candidate
// https://api.gem.com/v0/reference#tag/Candidate-Uploaded-Resumes/paths/~1v0~1candidates~1%7Bcandidate_id%7D~1uploaded_resumes~1%7Buser_id%7D/post
export interface GemCandidateUploadResumeParams {
    resume_file: string; // binary
}

export interface GemCandidateUploadResumeResponse {
    id: string;
    candidate_id: string;
    created_at: number;
    user_id: string;
    filename: string;
    download_url: string;
}

/**
 * Parameters for listing projects in Gem
 * https://api.gem.com/v0/reference#tag/Projects/paths/~1v0~1projects/get
 */
export interface GemListProjectsParams extends GemPagination {
    created_after?: number;
    created_before?: number;
    sort?: 'asc' | 'desc';
    user_id?: string;
    readable_by?: string;
    writable_by?: string;
    is_archived?: boolean;
}

export type GemJobStatus = 'open' | 'closed' | 'draft' | 'pending_approval' | 'approved';

export interface GemListJobsParams extends GemPagination {
    created_before?: string; // date-time format
    created_after?: string; // date-time format
    updated_before?: string; // date-time format
    updated_after?: string; // date-time format
    requisition_id?: string;
    status?: GemJobStatus;
    department_id?: string;
    office_id?: string;
    include_deleted?: boolean;
}

interface GemDepartment {
    id: string;
    name: string;
    parent_id: string;
    child_ids: string[];
    parent_department_external_id: string;
    child_department_external_ids: string[];
    deleted_at: string; // date-time format
}

interface GemJobHiringTeam {
    hiring_managers?: GemUserLite[];
    recruiters?: GemUserLite[];
    coordinators?: GemUserLite[];
    sourcers?: GemUserLite[];
}

export interface GemLocation {
    id: string;
    name: string;
    location: {
        name: string;
    };
    parent_id: string;
    child_ids: string[];
    parent_office_external_id: string;
    child_office_external_ids: string[];
    deleted_at: string; // date-time format
}

interface GemUserLite {
    id: string;
    name: string;
    first_name: string;
    last_name: string;
    employee_id: string;
}

export interface GemUser extends GemUserLite {
    primary_email_address: string; // email format
    updated_at: string; // date-time format
    created_at: string; // date-time format
    disabled: boolean;
    site_admin: boolean;
    emails: string[]; // email format
    linked_candidate_ids: string[];
    offices: GemLocation[];
    departments: GemDepartment[];
    deleted_at: string | null; // date-time format
}

interface GemJobLite {
    id: string;
    name: string;
}

export interface GemJob extends GemJobLite {
    requisition_id: string;
    confidential: boolean;
    status: GemJobStatus;
    created_at: string; // date-time format
    opened_at: string; // date-time format
    closed_at: string | null; // date-time format
    deleted_at: string | null; // date-time format
    updated_at: string; // date-time format
    is_template: boolean;
    departments: GemDepartment[];
    offices: GemLocation[];
    hiring_team: GemJobHiringTeam;
}

export interface GemListUsersParams extends GemPagination {
    created_before?: string; // date-time format
    created_after?: string; // date-time format
    updated_before?: string; // date-time format
    updated_after?: string; // date-time format
    email?: string;
    include_deleted?: boolean;
}

export interface GemCreateCandidateNoteParams {
    user_id: string;
    body: string; // <= 10000 characters
    visibility: 'public' | 'private';
}

export interface GemNote {
    id: string;
    created_at: string; // date-time format
    body: string;
    user: GemUserLite;
    private: boolean;
    visibility: 'public' | 'private';
}

/**
 * Job Postings
 */
// https://api.gem.com/ats/v0/reference#tag/Job-Post/paths/~1ats~1v0~1job_posts~1/get
export interface GemListJobPostsParams extends GemPagination {
    created_before?: string; // date-time format
    created_after?: string; // date-time format
    updated_before?: string; // date-time format
    updated_after?: string; // date-time format
    live?: boolean;
    active?: boolean;
}

export interface GemJobPost {
    id: string;
    title: string;
    active: boolean;
    live: boolean;
    first_published_at: string | null; // date-time format
    job_id: string;
    content: string;
    created_at: string; // date-time format
    updated_at: string; // date-time format
    deleted_at: string | null; // date-time format
}

/**
 * Application
 */

// https://api.gem.com/ats/v0/reference#tag/Application/paths/~1ats~1v0~1applications~1/get
export interface GemListApplicationsParams extends GemPagination {
    created_before?: string; // date-time format
    created_after?: string; // date-time format
    last_activity_after?: string; // date-time format
    job_id?: string;
    status?: 'active' | 'rejected' | 'hired';
    include_deleted?: 'true' | 'false';
}

export interface GemApplication {
    id: string;
    candidate_id: string;
    applied_at: string; // date-time
    rejected_at?: string; // date-time
    last_activity_at: string; // date-time
    source: GemApplicationSource;
    credited_to: string;
    rejection_reason?: GemRejectionReason;
    jobs: GemJobLite[];
    job_post_id: string;
    status: 'active' | 'rejected' | 'hired';
    current_stage: GemJobStageLite;
    deleted_at?: string; // date-time
}

export interface GemUpdateApplicationParams {
    source_id: GemApplicationSource['id'];
}

interface GemApplicationSource {
    id: string;
    public_name: string;
}

interface GemRejectionReasonType {
    id: string;
    name: string;
}

interface GemRejectionReason {
    id: string;
    name: string;
    type: GemRejectionReasonType;
}

/**
 * Job Stages
 */
// https://api.gem.com/ats/v0/reference#tag/Job-Stage/paths/~1ats~1v0~1job_stages~1/get
export interface GemListJobStagesParams extends GemPagination {
    created_before?: string; // date-time format
    created_after?: string; // date-time format
    updated_before?: string; // date-time format
    updated_after?: string; // date-time format
    include_deleted?: boolean;
}

// https://api.gem.com/ats/v0/reference#tag/Job-Stage/paths/~1ats~1v0~1jobs~1%7Bjob_id%7D~1stages/get
export interface GemListJobStagesForJobParams extends GemListJobStagesParams {}

export interface GemQuestionLite {
    id: string;
    name: string;
}

export interface GemInterviewKit {
    id: string;
    content: string;
    questions: GemQuestionLite[];
}

interface GemInterviewDefinitionLite {
    id: string;
    name: string;
}
export interface GemInterviewDefinition extends GemInterviewDefinitionLite {
    schedulable: boolean;
    estimated_minutes: number;
    default_interviewer_users: GemUserLite[];
    interview_kit: GemInterviewKit;
    deleted_at: string | null; // date-time format
    job_stage_interview_item_id: string;
}

interface GemJobStageLite {
    id: string;
    name: string;
}

export interface GemJobStage extends GemJobStageLite {
    created_at: string; // date-time
    updated_at: string; // date-time
    deleted_at?: string; // date-time
    active: boolean;
    job_id: string;
    priority: number;
    interviews: GemInterviewDefinition[];
}

/**
 * Scheduled Interviews
 */
// https://api.gem.com/ats/v0/reference#tag/Scheduled-Interview/paths/~1ats~1v0~1scheduled_interviews~1/get
export interface GemListScheduledInterviewsParams extends GemPagination {
    created_before?: string; // date-time format
    created_after?: string; // date-time format
    updated_before?: string; // date-time format
    updated_after?: string; // date-time format
    starts_before?: string; // date-time format
    starts_after?: string; // date-time format
    ends_before?: string; // date-time format
    ends_after?: string; // date-time format
    external_event_id?: string;
    actionable?: boolean;
    include_deleted?: boolean;
}

interface GemInterviewer {
    id: string;
    name: string;
    email: string; // email format
    employee_id: string;
    response_status: 'needs_action' | 'declined' | 'tentative' | 'accepted';
    scorecard_id: string;
}

export interface GemScheduledInterview {
    id: string;
    application_id: string;
    external_event_id?: string;
    created_at: string; // date-time format
    updated_at: string; // date-time format
    start: {
        date_time: string; // date-time format
    };
    end: {
        date_time: string; // date-time format
    };
    location: string;
    video_conferencing_url?: string; // url format
    status: 'scheduled' | 'awaiting_feedback' | 'complete';
    interview: GemInterviewDefinitionLite;
    organizer: GemUserLite;
    interviewers: GemInterviewer[];
    job_stage_interview_item_id: string;
}

/**
 * Gem project
 */
interface GemBaseProjectFieldProjectMembership {
    id: string; // ObjectID
    name: string; // The name of the project field is unique in its scope
    value_option_ids: string[]; // Array of ObjectIDs
}

interface GemTextProjectFieldProjectMembership extends GemBaseProjectFieldProjectMembership {
    value_type: 'text';
    value: string;
}

interface GemSingleSelectProjectFieldProjectMembership extends GemBaseProjectFieldProjectMembership {
    value_type: 'single_select';
    value: string; // A string of an option value
}

interface GemMultiSelectProjectFieldProjectMembership extends GemBaseProjectFieldProjectMembership {
    value_type: 'multi_select';
    value: string[];
}

type GemProjectFieldProjectMembership =
    | GemTextProjectFieldProjectMembership
    | GemSingleSelectProjectFieldProjectMembership
    | GemMultiSelectProjectFieldProjectMembership;

export interface GemProject {
    id: string; // ObjectID
    created_at: number; // integer >= 1
    user_id: string; // ObjectID, The user id of the project owner
    name: string; // <= 255 characters
    privacy_type: 'confidential' | 'personal' | 'shared'; // Default: "personal"
    description: string | null; // <= 2000 characters
    is_archived: boolean;
    project_fields: Array<GemProjectFieldProjectMembership> | null; // Project fields containing the associated values for the project
    context: string; // Summary of top project fields for a project
}

export interface GemTeamUser {
    id: string;
    name: string;
    email: string;
}

export interface CreateCandidate {
    id: string; // ObjectID
    created_at: number; // integer >= 1
    created_by: string; // ObjectID
    last_updated_at: number | null; // integer >= 1 or null

    candidate_greenhouse_id: string | null; // max 255 chars
    first_name: string | null; // max 255 chars
    last_name: string | null; // max 255 chars
    nickname: string | null; // max 255 chars
    weblink: string; // non-empty string

    emails: GemEmail[]; // max 20 items
    phone_number: string | null; // max 255 chars
    location: string | null; // max 255 chars
    linked_in_handle: string | null; // max 255 chars

    profiles: GemProfile[];
    company: string | null; // max 255 chars
    title: string | null; // max 255 chars
    school: string | null; // max 255 chars

    education_info: GemEducationInfo[];
    work_info: GemWorkInfo[];
    custom_fields: GemCustomFieldCandidateMembership[];

    due_date: {
        date: string; // ISO date format
        user_id: string;
        note: string;
    } | null;

    project_ids: string[] | null; // max 20 ObjectIDs

    sourced_from: 'SeekOut' | 'hireEZ' | 'Starcircle' | 'Censia' | 'Consider' | null;
    gem_source: 'SeekOut' | 'hireEZ' | 'Starcircle' | 'Censia' | 'Consider' | null;
}

interface GemProfile {
    network: string; // max 255 chars
    url: string; // valid URL
    username: string; // max 255 chars
}
