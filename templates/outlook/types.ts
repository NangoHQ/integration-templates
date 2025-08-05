export interface OutlookMessage {
    id: string;
    from: EmailContact;
    toRecipients: EmailContact[];
    receivedDateTime: string;
    subject: string;
    hasAttachments: boolean;
    conversationId: string;
    body: BodyItem;
}

interface EmailAddress {
    address: string;
}
interface BodyItem {
    content: string;
    contentType: string;
}
export interface Attachment {
    contentType: string;
    id: string;
    name: string;
    size: number;
}

export interface EmailContact {
    emailAddress: EmailAddress;
}

export interface OutlookFolderResponse {
    id: string;
    displayName: string;
    parentFolderId: string;
    childFolderCount: number;
    unreadItemCount: number;
    totalItemCount: number;
    isHidden: boolean;
}

export interface OutlookEvent {
    '@odata.id': string;
    '@odata.type': string;
    '@odata.etag': string;
    id: string;
    subject: string;
    bodyPreview: string;
    importance: 'low' | 'normal' | 'high';
    sensitivity: 'normal' | 'personal' | 'private' | 'confidential';
    isAllDay: boolean;
    isCancelled: boolean;
    isOrganizer: boolean;
    responseRequested: boolean;
    webLink: string;
    onlineMeetingProvider: 'teamsForBusiness' | 'skypeForBusiness' | 'skypeForConsumer' | 'unknown';
    responseStatus: {
        response: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded';
        time: string;
    };
    body: {
        contentType: 'html' | 'text';
        content: string;
    };
    start: Timeslot;
    end: Timeslot;
    location: {
        address: {
            street?: string;
            city?: string;
            state?: string;
            countryOrRegion?: string;
            postalCode?: string;
        };
        coordinates: {
            latitude?: number;
            longitude?: number;
            altitude?: number;
            accuracy?: number;
            altitudeAccuracy?: number;
        };
        locationEmailAddress: string;
        locationUri: string;
        displayName: string;
        locationType:
            | 'default'
            | 'conferenceRoom'
            | 'homeAddress'
            | 'businessAddress'
            | 'geoCoordinates'
            | 'streetAddress'
            | 'hotel'
            | 'restaurant'
            | 'localBusiness'
            | 'postalAddress';
        uniqueId: string;
        uniqueIdType: string;
    };
    recurrence: {
        pattern: RecurrencePattern;
        range: RecurrenceRange;
    } | null;
    attendees: Attendee[];
    organizer: {
        emailAddress: {
            name: string;
            address: string;
        };
    };
    onlineMeeting: OnlineMeetingInfo | null;
}

type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

interface RecurrencePattern {
    dayOfMonth?: number;
    daysOfWeek?: DayOfWeek[];
    firstDayOfWeek?: DayOfWeek;
    index?: 'first' | 'second' | 'third' | 'fourth' | 'last';
    interval: number;
    month?: number;
    type: 'daily' | 'weekly' | 'absoluteMonthly' | 'relativeMonthly' | 'absoluteYearly' | 'relativeYearly';
}

interface RecurrenceRange {
    type: 'endDate' | 'noEnd' | 'numbered';
    startDate: string;
    endDate?: string;
    numberOfOccurrences?: number;
    recurrenceTimeZone?: string;
}

interface Attendee {
    emailAddress: {
        name: string;
        address: string;
    };
    proposedNewTime?: {
        start: Timeslot;
        end: Timeslot;
    };
    status: {
        response: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded';
        time: string;
    };
    type: 'required' | 'optional' | 'resource';
}

interface Phone {
    number: string;
    type: 'home' | 'business' | 'mobile' | 'other' | 'assistant' | 'homeFax' | 'businessFax' | 'otherFax' | 'pager' | 'radio';
}

interface Timeslot {
    dateTime: string;
    timeZone: string;
}
interface OnlineMeetingInfo {
    conferenceId?: string;
    joinUrl?: string;
    phones?: Phone[];
    quickDial?: string;
    tollFreeNumbers?: string[];
    tollNumber?: string;
}

export interface SingleEventContent {
    '@odata.context': string;
    '@odata.etag': string;
    body: {
        content: string;
        contentType: 'html' | 'text';
    };
    'calendar@odata.associationLink': string;
    'calendar@odata.navigationLink': string;
    id: string;
}
