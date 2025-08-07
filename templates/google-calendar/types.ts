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

// https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest
export interface GoogleCalendarEventsResponse {
    kind: string;
    id: string;
    status: string;
    htmlLink: string;
    created: string;
    etag: string;
    updated: string;
    summary: string;
    description?: string;
    location?: string;
    colorId?: string;
    creator?: {
        id?: string;
        email?: string;
        displayName?: string;
        self?: boolean;
    };
    organizer?: {
        id?: string;
        email?: string;
        displayName?: string;
        self?: boolean;
    };
    start: EventDateTime;
    end: EventDateTime;
    endTimeUnspecified?: boolean;
    recurrence?: string[];
    recurringEventId?: string;
    originalStartTime?: EventDateTime;
    transparency?: string;
    visibility?: string;
    iCalUID?: string;
    sequence?: number;
    attendees?: EventAttendee[];
    attendeesOmitted?: boolean;
    extendedProperties?: {
        private?: Record<string, string>;
        shared?: Record<string, string>;
    };
    hangoutLink?: string;
    conferenceData?: ConferenceData;
    gadget?: {
        type?: string;
        title?: string;
        link?: string;
        iconLink?: string;
        width?: number;
        height?: number;
        display?: string;
        preferences?: Record<string, string>;
    };
    anyoneCanAddSelf?: boolean;
    guestsCanInviteOthers?: boolean;
    guestsCanModify?: boolean;
    guestsCanSeeOtherGuests?: boolean;
    privateCopy?: boolean;
    locked?: boolean;
    reminders?: {
        useDefault: boolean;
        overrides?: EventReminder[];
    };
    source?: {
        url?: string;
        title?: string;
    };
    attachments?: EventAttachment[];
    eventType: string;
    workingLocationProperties?: EventWorkingLocationProperties;
    outOfOfficeProperties?: EventOutOfOfficeProperties;
    focusTimeProperties?: EventFocusTimeProperties;
    birthdayProperties?: EventBirthdayProperties;
}

interface EventDateTime {
    date?: string;
    dateTime?: string;
    timeZone?: string;
}

interface EventAttendee {
    id?: string;
    email?: string;
    displayName?: string;
    organizer?: boolean;
    self?: boolean;
    resource?: boolean;
    optional?: boolean;
    responseStatus?: string;
    comment?: string;
    additionalGuests?: number;
}

interface EventReminder {
    method: string;
    minutes: number;
}

interface EventAttachment {
    fileUrl: string;
    title?: string;
    mimeType?: string;
    iconLink?: string;
    fileId?: string;
}

interface ConferenceData {
    createRequest?: CreateConferenceRequest;
    entryPoints?: EntryPoint[];
    conferenceSolution?: ConferenceSolution;
    conferenceId?: string;
    signature?: string;
    notes?: string;
    parameters?: ConferenceParameters;
}

interface CreateConferenceRequest {
    requestId: string;
    conferenceSolutionKey: ConferenceSolutionKey;
    status: ConferenceRequestStatus;
}

interface ConferenceSolutionKey {
    type: string;
}

interface ConferenceRequestStatus {
    statusCode: string;
}

interface ConferenceSolution {
    key: ConferenceSolutionKey;
    name: string;
    iconUri: string;
}

interface EntryPoint {
    entryPointType: string;
    uri?: string;
    label?: string;
    pin?: string;
    accessCode?: string;
    meetingCode?: string;
    passcode?: string;
    password?: string;
}

interface ConferenceParameters {
    addOnParameters?: ConferenceParametersAddOnParameters;
}

interface ConferenceParametersAddOnParameters {
    parameters?: Record<string, string>;
}

interface EventWorkingLocationProperties {
    type: string;
    homeOffice?: any;
    officeLocation?: {
        buildingId?: string;
        floorId?: string;
        floorSectionId?: string;
        deskId?: string;
        label?: string;
    };
    customLocation?: {
        label?: string;
    };
}

interface EventOutOfOfficeProperties {
    autoDeclineMode?: string;
    declineMessage?: string;
}

interface EventFocusTimeProperties {
    autoDeclineMode?: string;
    chatStatus?: string;
    declineMessage?: string;
}

interface EventBirthdayProperties {
    type?: string;
    contact?: string;
    customTypeName?: string;
}
