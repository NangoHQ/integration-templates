// ---------------------------
// This file was generated by Nango (v0.58.7)
// You can version this file
// ---------------------------

export interface IdEntity {
    id: string;
}

export interface SuccessResponse {
    success: boolean;
}

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
}

export interface CreateUser {
    email: string;
}

export interface UserInformation {
    id: string;
    email: string;
}

export interface EventLocation {
    type?: string;
    location?: string | null;
    join_url?: string | null;
    status?: string | null;
    additional_info?: string | null;
}

export interface InviteesCounter {
    total: number;
    active: number;
    limit: number;
}

export interface EventMembership {
    user: string;
    user_email: string | null;
    user_name: string;
    buffered_end_time?: string;
    buffered_start_time?: string;
}

export interface EventGuest {
    email: string;
    created_at: string;
    updated_at: string;
}

export interface CalendarEvent {
    kind: string;
    external_id: string;
}

export interface EventCancellation {
    canceled_by: string;
    reason: string | null;
    canceler_type: string;
    created_at: string;
}

export interface Event {
    id: string;
    uri: string;
    name: string | null;
    meeting_notes_plain: string | null;
    meeting_notes_html: string | null;
    status: 'active' | 'canceled';
    start_time: string;
    end_time: string;
    event_type: string;
    location: EventLocation;
    invitees_counter: InviteesCounter;
    created_at: string;
    updated_at: string;
    event_memberships: EventMembership[];
    event_guests?: EventGuest[];
    calendar_event: CalendarEvent | null;
    cancellation?: EventCancellation;
}

export interface EventTypeLocation {
    kind: string;
    phone_number?: number | null;
    additional_info?: string | null;
}

export interface EventQuestion {
    name: string;
    type: string;
    position: number;
    enabled: boolean;
    required: boolean;
    answer_choices: string[];
    include_other: boolean;
}

export interface EventProfile {
    type: string;
    name: string;
    owner: string;
}

export interface EventType {
    id: string;
    uri: string;
    name: string | null;
    active: boolean;
    booking_method: string;
    slug: string | null;
    scheduling_url: string;
    duration: number;
    duration_options: number[] | null;
    kind: string;
    pooling_type: string | null;
    type: string;
    color: string;
    created_at: string;
    updated_at: string;
    internal_note: string | null;
    description_plain: string | null;
    description_html: string | null;
    profile: EventProfile | null;
    secret: boolean;
    deleted_at: string | null;
    admin_managed: boolean;
    locations: EventTypeLocation[] | null;
    custom_questions: EventQuestion[];
    position: number;
}

export interface QuestionAndAnswer {
    answer: string;
    position: number;
    question: string;
}

export interface Tracking {
    utm_campaign: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_content: string | null;
    utm_term: string | null;
    salesforce_uuid: string | null;
}

export interface Payment {
    external_id: string;
    provider: string;
    amount: number;
    currency: string;
    terms: string;
    successful: boolean;
}

export interface Reconfirmation {
    created_at: string;
    confirmed_at: string;
}

export interface EventInvitee {
    id: string;
    cancel_url: string;
    created_at: string;
    email: string;
    event: string;
    name: string;
    first_name: string | null;
    last_name: string | null;
    new_invitee: string | null;
    old_invitee: string | null;
    questions_and_answers: QuestionAndAnswer[];
    reschedule_url: string;
    rescheduled: boolean;
    status: string;
    text_reminder_number: string | null;
    timezone: string;
    tracking: Tracking;
    updated_at: string;
    uri: string;
    cancellation?: EventCancellation;
    routing_form_submission: string | null;
    payment: Payment | null;
    no_show: string | null;
    reconfirmation: Reconfirmation | null;
    scheduling_method: string | null;
    invitee_scheduled_by: string | null;
}
