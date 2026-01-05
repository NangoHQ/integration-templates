export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

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
  profile: {  type: string;
  name: string;
  owner: string;} | null;
  secret: boolean;
  deleted_at: string | null;
  admin_managed: boolean;
  locations: ({  kind: string;
  phone_number?: number | null | undefined;
  additional_info?: string | null | undefined;})[] | null;
  custom_questions: ({  name: string;
  type: string;
  position: number;
  enabled: boolean;
  required: boolean;
  answer_choices: string[];
  include_other: boolean;})[];
  position: number;
};

export interface Event {
  id: string;
  created_at: string;
  start_at: string;
  end_at: string;
  cover_url: string;
  name: string;
  description: string;
  description_md: string;
  series_api_id: string | null;
  duration_interval_iso8601: string;
  geo_latitude: string | null;
  geo_longitude: string | null;
  geo_address_json: {  city: string;
  type: string;
  region: string;
  address: string;
  country: string;
  latitude: string;
  place_id: string;
  longitude: string;
  city_state: string;
  description: string;
  full_address: string;} | null;
  url: string;
  timezone: string;
  event_type: string;
  user_api_id: string;
  visibility: string;
  meeting_url: string | null;
  zoom_meeting_url: string | null;
};

export interface SyncMetadata_calendly_eventinvitees {
};

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
  questions_and_answers: ({  answer: string;
  position: number;
  question: string;})[];
  reschedule_url: string;
  rescheduled: boolean;
  status: string;
  text_reminder_number: string | null;
  timezone: string;
  tracking: {  utm_campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  utm_term: string | null;
  salesforce_uuid: string | null;};
  updated_at: string;
  uri: string;
  cancellation: {  canceled_by: string;
  reason: string | null;
  canceler_type: string;
  created_at: string;};
  routing_form_submission: string | null;
  payment: {  external_id: string;
  provider: string;
  amount: number;
  currency: string;
  terms: string;
  successful: boolean;} | null;
  no_show: string | null;
  reconfirmation: {  created_at: string;
  confirmed_at: string;} | null;
  scheduling_method: string | null;
  invitee_scheduled_by: string | null;
};

export interface SyncMetadata_calendly_eventtypes {
};

export interface SyncMetadata_calendly_events {
};

export interface SyncMetadata_calendly_users {
};

export interface ActionInput_calendly_createuser {
  email: string;
};

export interface ActionOutput_calendly_createuser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export interface ActionInput_calendly_deleteuser {
  id: string;
};

export interface ActionOutput_calendly_deleteuser {
  success: boolean;
};

export type ActionInput_calendly_whoami = void

export interface ActionOutput_calendly_whoami {
  id: string;
  email: string;
};
