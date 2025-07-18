// ---------------------------
// This file was generated by Nango (v0.62.0)
// You can version this file
// ---------------------------

export interface IdEntity {
    id: string;
}

export interface OptionalBackfillSetting {
    backfillPeriodMs: number;
}

export interface Attachments {
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
}

export interface OutlookEmail {
    id: string;
    sender?: string;
    recipients?: string | undefined;
    date: string;
    subject: string;
    body: string;
    attachments: Attachments[];
    threadId: string;
}

export interface DocumentInput {
    threadId: string;
    attachmentId: string;
}

export interface EmailAddress {
    address: string;
    name: string;
}

export interface OutlookCalendar {
    id: string;
    allowedOnlineMeetingProviders: string[];
    canEdit: boolean;
    canShare: boolean;
    canViewPrivateItems: boolean;
    changeKey: string;
    color:
        | 'auto'
        | 'lightBlue'
        | 'lightGreen'
        | 'lightOrange'
        | 'lightGray'
        | 'lightYellow'
        | 'lightTeal'
        | 'lightPink'
        | 'lightBrown'
        | 'lightRed'
        | 'maxColor';
    defaultOnlineMeetingProvider: string;
    hexColor: string;
    isDefaultCalendar: boolean;
    isRemovable: boolean;
    isTallyingResponses: boolean;
    name: string;
    owner: EmailAddress;
}

export interface BodyContent {
    content: string;
    contentType: 'text' | 'html';
}

export interface TimeSlot {
    dateTime: string;
    timeZone: string;
}

export interface Attendee {
    emailAddress: EmailAddress;
    proposedNewTime?: { start: TimeSlot; end: TimeSlot };
    status: { response: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded'; sentDateTime: string };
    type: 'required' | 'optional' | 'resource';
}

export interface Location {
    address?: { city?: string; countryOrRegion?: string; postalCode?: string; state?: string; street?: string };
    coordinates?: { accuracy?: number; altitude?: number; altitudeAccuracy?: number; latitude?: number; longitude?: number };
    displayName?: string;
    locationEmailAddress?: string;
    locationUri?: string;
    locationType?:
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
    uniqueId?: string;
    uniqueIdType?: string;
}

export interface OnlineMeetingInfo {
    conferenceId?: string | undefined;
    joinUrl?: string | undefined;
    phones: { number: string; type: 'home' | 'business' | 'mobile' | 'other' | 'assistant' | 'homeFax' | 'businessFax' | 'otherFax' | 'pager' | 'radio' }[];
    quickDial?: string | undefined;
    tollFreeNumbers: string[];
    tollNumber?: string | undefined;
}

export interface PatternedRecurrence {
    pattern: {
        dayOfMonth?: number;
        daysOfWeek?: string[];
        firstDayOfWeek?: string;
        index?: 'first' | 'second' | 'third' | 'fourth' | 'last';
        interval: number;
        month?: number;
        type: 'daily' | 'weekly' | 'absoluteMonthly' | 'relativeMonthly' | 'absoluteYearly' | 'relativeYearly';
    };
    range: { endDate?: string; numberOfOccurrences?: number; recurrenceTimeZone?: string; startDate: string; type: 'endDate' | 'noEnd' | 'numbered' };
}

export interface OutlookCalendarEvent {
    id: string;
    attendees: Attendee[];
    bodyPreview: string;
    end: { dateTime: string; timeZone: string };
    importance: 'low' | 'normal' | 'high';
    isAllDay: boolean;
    isCancelled: boolean;
    isOrganizer: boolean;
    location: Location;
    onlineMeeting: OnlineMeetingInfo | null;
    onlineMeetingProvider: string;
    organizer: { emailAddress: EmailAddress };
    recurrence: PatternedRecurrence | null;
    responseRequested: boolean;
    responseStatus: { response: string; time: string };
    sensitivity: 'normal' | 'personal' | 'private' | 'confidential';
    start: { dateTime: string; timeZone: string };
    subject: string;
    webLink: string;
}

export interface OutlookFolder {
    id: string;
    displayName: string;
    parentFolderId: string;
    childFolderCount: number;
    unreadItemCount: number;
    totalItemCount: number;
    isHidden: boolean;
}

/** @deprecated It is recommended to use a Model */
export type Anonymous_outlook_action_fetchattachment_output = string;
