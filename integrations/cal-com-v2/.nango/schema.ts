export interface SyncMetadata_cal_com_v2_eventtypes {
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

export interface SyncMetadata_cal_com_v2_events {
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
