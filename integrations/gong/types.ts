export interface GongUser {
    id: string;
    emailAddress: string;
    created: string;
    active: boolean;
    emailAliases: string[];
    trustedEmailAddress: string;
    firstName: string;
    lastName: string;
    title: string;
    phoneNumber: string;
    extension: string;
    personalMeetingUrls: string[];
    settings: Record<string, boolean>;
    managerId: string;
    meetingConsentPageUrl: string;
    spokenLanguages: {
        language?: string;
        proficiency?: string;
    }[];
}

export interface FilterFields {
    fromDateTime?: string | undefined;
    toDateTime?: string | undefined;
    workspaceId?: string | undefined;
    callIds?: string[] | undefined;
}

export interface ExposedFields {
    parties: boolean;
    content: {
        structure: boolean;
        topics: boolean;
        trackers: boolean;
        trackerOccurrences: boolean;
        pointsOfInterest: boolean;
        brief: boolean;
        outline: boolean;
        highlights: boolean;
        callOutcome: boolean;
        keyPoints: boolean;
    };
    interaction: {
        speakers: boolean;
        video: boolean;
        personInteractionStats: boolean;
        questions: boolean;
    };
    collaboration: {
        publicComments: boolean;
    };
    media: boolean;
}

interface Sentence {
    start: number;
    end: number;
    text: string;
}

interface Transcript {
    speakerId: string;
    topic: string;
    sentences: Sentence[];
}

export interface GongCallTranscript {
    callId: string;
    transcript: Transcript[];
}

export interface GongCallTranscriptResponse {
    callTranscripts: GongCallTranscript[];
    records: {
        totalRecords: number;
        currentPageSize: number;
        currentPageNumber: number;
        cursor?: string;
    };
}
export interface GongCallResponse {
    id: string;
    url: string;
    title: string;
    scheduled: string;
    started: string;
    duration: number;
    primaryUserId: string;
    direction: 'Inbound' | 'Outbound' | 'Conference' | 'Unknown';
    system: string;
    scope: 'Internal' | 'External' | 'Unknown';
    media: 'Video' | 'Audio';
    language: string;
    workspaceId: string;
    sdrDisposition: string;
    clientUniqueId: string;
    customData: string;
    purpose: string;
    meetingUrl: string;
    isPrivate: boolean;
    calendarEventId: string;
}

interface ContextField {
    name: string;
    value: string;
}

interface ContextObject {
    objectType: string;
    objectId: string;
    fields: ContextField[];
    timing: string;
}

interface SystemContext {
    system: string;
    objects: ContextObject[];
}

interface Party {
    id: string;
    emailAddress: string;
    name: string;
    title: string;
    userId: string;
    speakerId: string;
    context: SystemContext[];
    affiliation: 'Internal' | 'External' | 'Unknown';
    phoneNumber: string;
    methods: string[];
}

interface ContentStructure {
    name: string;
    duration: number;
}

interface TrackerOccurrence {
    startTime: number;
    speakerId: string;
}

interface TrackerPhrase {
    count: number;
    occurrences: TrackerOccurrence[];
    phrase: string;
}

interface Tracker {
    id: string;
    name: string;
    count: number;
    type: 'KEYWORD' | 'SMART';
    occurrences: TrackerOccurrence[];
    phrases: TrackerPhrase[];
}

interface Topic {
    name: string;
    duration: number;
}

interface PointOfInterest {
    snippetStartTime: number;
    snippetEndTime: number;
    speakerID: string;
    snippet: string;
}

interface OutlineItem {
    text: string;
    startTime: number;
}

interface Outline {
    section: string;
    startTime: number;
    duration: number;
    items: OutlineItem[];
}

interface HighlightItem {
    text: string;
    startTimes: number[];
}

interface Highlight {
    title: string;
    items: HighlightItem[];
}

interface CallOutcome {
    id: string;
    category: string;
    name: string;
}

interface KeyPoint {
    text: string;
}

interface InteractionSpeaker {
    id: string;
    userId: string;
    talkTime: number;
}

interface InteractionStat {
    name: string;
    value: number;
}

interface VideoInteraction {
    name: string;
    duration: number;
}

interface InteractionQuestions {
    companyCount: number;
    nonCompanyCount: number;
}

interface Interaction {
    speakers: InteractionSpeaker[];
    interactionStats: InteractionStat[];
    video: VideoInteraction[];
    questions: InteractionQuestions;
}

interface CollaborationComment {
    id: string;
    audioStartTime: number;
    audioEndTime: number;
    commenterUserId: string;
    comment: string;
    posted: number;
    inReplyTo?: string;
    duringCall: boolean;
}

interface Collaboration {
    publicComments: CollaborationComment[];
}

interface Media {
    audioUrl: string;
    videoUrl: string;
}

interface Content {
    structure: ContentStructure[];
    trackers: Tracker[];
    topics: Topic[];
    pointsOfInterest: { actionItems: PointOfInterest[] };
    brief: string;
    outline: Outline[];
    highlights: Highlight[];
    callOutcome: CallOutcome;
    keyPoints: KeyPoint[];
}

export interface GongCallExtensive {
    metaData: GongCallResponse;
    context: SystemContext[];
    parties: Party[];
    content: Content;
    interaction: Interaction;
    collaboration: Collaboration;
    media: Media;
}

export interface AxiosError<E = any> {
    message: string;
    name: string;
    code: string;
    response?: {
        status: number;
        statusText: string;
        data: E;
    };
}

export interface GongError {
    requestId: string;
    errors: string[];
}
export const ExposedFieldsKeys: ExposedFields = {
    parties: true,
    content: {
        structure: true,
        topics: true,
        trackers: true,
        trackerOccurrences: true,
        pointsOfInterest: true,
        brief: true,
        outline: true,
        highlights: true,
        callOutcome: true,
        keyPoints: true
    },
    interaction: {
        speakers: true,
        video: true,
        personInteractionStats: true,
        questions: true
    },
    collaboration: {
        publicComments: true
    },
    media: true
};
