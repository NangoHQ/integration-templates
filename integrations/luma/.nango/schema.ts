// ---------------------------
// This file was generated by Nango (v0.58.7)
// You can version this file
// ---------------------------

export interface Timestamps {
    created_at: string;
    start_at: string;
    end_at: string;
}

export interface GeoAddress {
    city: string;
    type: string;
    region: string;
    address: string;
    country: string;
    latitude: string;
    place_id: string;
    longitude: string;
    city_state: string;
    description: string;
    full_address: string;
}

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
    geo_address_json: GeoAddress | null;
    url: string;
    timezone: string;
    event_type: string;
    user_api_id: string;
    visibility: string;
    meeting_url: string | null;
    zoom_meeting_url: string | null;
}
