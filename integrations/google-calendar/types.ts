export interface GoogleUserInfoResponse {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
}

export interface GoogleCalendarSettingResponse {
    kind: string;
    etag: string;
    id: string;
    value: string;
}

export interface GoogleCalendarSettingsResponse {
    kind: string;
    etag: string;
    items: GoogleCalendarSettingResponse[];
    nextPageToken?: string;
    nextSyncToken?: string;
}
