export interface OutlookCalendar {
    id: string;
    allowedOnlineMeetingProviders: string[];
    canEdit: boolean;
    canShare: boolean;
    canViewPrivateItems: boolean;
    changeKey: string;
    color: CalendarColor;
    defaultOnlineMeetingProvider: string;
    hexColor: string;
    isDefaultCalendar: boolean;
    isRemovable: boolean;
    isTallyingResponses: boolean;
    name: string;
    owner: EmailAddress;
}
type CalendarColor =
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

interface EmailAddress {
    address: string;
    name: string;
}

export interface OutlookEvent {
    id: string;
    allowNewTimeProposals?: boolean;
    attendees: Attendee[];
    body: ItemBody;
    bodyPreview: string;
    categories: string[];
    changeKey: string;
    createdDateTime: string; // ISO 8601 format, UTC time
    end: DateTimeTimeZone;
    hasAttachments: boolean;
    hideAttendees: boolean;
    iCalUId: string;
    importance: 'low' | 'normal' | 'high';
    isAllDay: boolean;
    isCancelled: boolean;
    isDraft: boolean;
    isOnlineMeeting?: boolean;
    isOrganizer: boolean;
    isReminderOn: boolean;
    lastModifiedDateTime: string; // ISO 8601 format, UTC time
    location: Location;
    locations: Location[];
    onlineMeeting: OnlineMeetingInfo | null;
    onlineMeetingProvider?: string;
    onlineMeetingUrl?: string;
    organizer: Recipient;
    originalEndTimeZone: string;
    originalStart: string; // ISO 8601 format, UTC time
    originalStartTimeZone: string;
    recurrence: PatternedRecurrence;
    reminderMinutesBeforeStart: number;
    responseRequested: boolean;
    responseStatus: ResponseStatus;
    sensitivity: 'normal' | 'personal' | 'private' | 'confidential';
    seriesMasterId: string;
    showAs: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
    start: DateTimeTimeZone;
    subject: string;
    transactionId?: string;
    type: 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster';
    webLink: string;
}

interface Location {
    address: PhysicalAddress;
    coordinates: OutlookGeoCoordinates;
    displayName: string;
    locationEmailAddress?: string;
    locationUri?: string;
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
    uniqueIdType: LocationUniqueIdType;
}

interface PhysicalAddress {
    city: string;
    countryOrRegion: string;
    postalCode: string;
    state: string;
    street: string;
}

interface OutlookGeoCoordinates {
    accuracy: number;
    altitude: number;
    altitudeAccuracy: number;
    latitude: number;
    longitude: number;
}

interface OnlineMeetingInfo {
    conferenceId: string;
    joinUrl: string;
    phones: Phone[];
    quickDial: string;
    tollFreeNumbers: string[];
    tollNumber: string;
}

interface Phone {
    number: string;
    type: 'home' | 'business' | 'mobile' | 'other' | 'assistant' | 'homeFax' | 'businessFax' | 'otherFax' | 'pager' | 'radio';
}

interface Recipient {
    emailAddress: EmailAddress;
}

interface EmailAddress {
    address: string;
    name: string;
}

interface PatternedRecurrence {
    pattern: RecurrencePattern;
    range: RecurrenceRange;
}

interface RecurrencePattern {
    dayOfMonth?: number;
    daysOfWeek?: DayOfWeek[];
    firstDayOfWeek: DayOfWeek;
    index?: WeekIndex;
    interval: number;
    month?: number;
    type: 'daily' | 'weekly' | 'absoluteMonthly' | 'relativeMonthly' | 'absoluteYearly' | 'relativeYearly';
}

type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

type WeekIndex = 'first' | 'second' | 'third' | 'fourth' | 'last';

interface RecurrenceRange {
    endDate?: string;
    numberOfOccurrences?: number;
    recurrenceTimeZone?: string;
    startDate: string;
    type: 'endDate' | 'noEnd' | 'numbered';
}

interface DateTimeTimeZone {
    dateTime: string; // ISO 8601 format
    timeZone: string;
}

type LocationUniqueIdType = string;

interface Attendee {
    emailAddress: EmailAddress;
    proposedNewTime?: TimeSlot;
    status: ResponseStatus;
    type: 'required' | 'optional' | 'resource';
}

interface TimeSlot {
    start: DateTimeTimeZone;
    end: DateTimeTimeZone;
}

interface ResponseStatus {
    response: 'none' | 'accepted' | 'declined' | 'tentative';
    sentDateTime: string; // ISO 8601 format
}

interface ItemBody {
    content: string;
    contentType: 'text' | 'html';
}
