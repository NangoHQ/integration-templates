export interface BrightCrowdBook {
    id: string;
    uri: string;
    userUri: string;
    alias: string;
    organizationUri: string;
    baUri: string;
    name: string;
    pictureId?: string | null;
    bookTemplateUri: string;
    accessTypes: AccessType[];
    config?: string | null;
    disclaimer: Disclaimer;
    coverPictureId?: string | null;
    bannerPictureId?: string | null;
    frontMatter: FrontMatter;
    preface?: Preface | null;
    instructions: Instructions;
    affiliation?: Affiliation | null;
    options: BookOptions;
    pagePresentation: PagePresentation;
    map?: Map | null;
    sort: SortOption[];
    sso?: SSOConfig | null;
    questions: Question[];
    flags: string[];
    configHash?: string;
    configHashedAt?: string;
    publishedAt?: string | null;
    closedAt?: string | null;
    lockedAt?: string | null;
    created: string;
    modified: string;
    albumCount: number;
    cityCount: number;
}

type AccessType = 'sso' | 'domains' | 'allow-list' | 'hashed-allow-list' | 'access-code' | 'config';

interface Disclaimer {
    text: string;
    link: string;
}

interface FrontMatter {
    sections: FrontMatterSection[];
}

export interface FrontMatterSection {
    uri: string;
    title: string;
    snippet: string;
    disabled?: boolean;
}

interface Preface {
    text: string;
    docId?: string;
    video?: string;
    pictures?: string[];
}

interface Instructions {
    addPage?: string | null;
    editPage?: string | null;
    requestAccess?: string | null;
}

export interface Affiliation {
    type: 'UniversityAffiliation' | 'CompanyAffiliation' | 'OtherAffiliation';
    organization?: string | null;
    major?: string[];
    degree?: string[];
    school?: string[];
    graduationYear?: number | null;
    specialty?: string[];
    category?: string[];
    title?: string;
    startYear?: number | null;
    endYear?: number | null;
    office?: string[];
    group?: string[];
    customField1?: string[];
    customField2?: string[];
    customField3?: string[];
    customField4?: string[];
    customField5?: string[];
}

interface BookOptions {
    audience: 'alumni' | 'students';
    theme: string;
}

interface PagePresentation {
    header: 'name' | 'greeting';
    subheader: 'education' | 'work' | 'none';
}

interface Map {
    name: string;
    lat: number;
    lng: number;
    zoom: number;
}

interface SortOption {
    id: string;
    label: string;
    questionId: string;
    fieldGroupId: string;
    fieldId: string;
    active: boolean;
    default: boolean;
}

interface SSOConfig {
    linkText: string;
}

export interface Question {
    id: string;
    type:
        | 'BasicInfo'
        | 'Affiliation'
        | 'UniversityAffiliation'
        | 'CompanyAffiliation'
        | 'OtherAffiliation'
        | 'CurrentLocation'
        | 'FuturePlans'
        | 'ContactInfo'
        | 'Skills'
        | 'Question'
        | 'Photos';
    name: string;
    description?: string;
    warning?: string;
    route: string;
    questionHeader?: string;
    questionSubheader?: string;
    headline?: string;
    active: boolean;
    required: boolean;
    adminOnly: boolean;
    fields: QuestionField[];
}

export interface QuestionField {
    id: string;
    label: string;
    type: 'short-text' | 'long-text' | 'drop-down' | 'combo-box' | 'autocomplete' | 'year' | 'year-range' | 'headline';
    placeholder?: string;
    active: boolean;
    required: boolean;
    maxcount?: number;
    maxlength?: number;
    allowMentions: boolean;
    customizable: boolean;
    keywordId?: string;
    options?: (string | object)[];
}

// Page
export interface BrightCrowdPage {
    id: string;
    uri: string;
    userUri: string;
    bookUri: string;
    alias: string;
    name: string;
    status: 'draft' | 'published' | 'hidden';
    content: Content;
    pictures?: Picture[];
    videos?: Video[];
    tagUsers?: string[];
    homeTown?: Location | null;
    currentCity?: Location | null;
    campusResidence?: string;
    affiliations?: Affiliation[];
    plan?: 'work' | 'school' | 'other';
    pageElements: PageElement[];
    description?: string;
    sections: Section[];
    outgoingMentions?: Mention[];
    incomingMentions?: Mention[];
    baUri: string;
    pageAlias: string;
    created: string;
    modified: string;
    modifiedByUserAt?: string;
    completedByUserAt?: string;
    renderedAt: string;
    externalId?: string;
}

export interface Content {
    firstName: string;
    lastName: string;
    previousName?: string | null;
    suffix?: string;
    partnerFirstName?: string | null;
    partnerLastName?: string | null;
    pronouns: string;
    pictureId?: string | null;
    audioId?: string | null;
}

export interface Picture {
    id: string;
    type: 'profile' | 'content' | 'caption';
    caption?: string | null;
}

export interface Video {
    url: string;
    caption?: string | null;
}

export interface Location {
    name: string;
    location: GeoJSON;
}

interface GeoJSON {
    type: 'Point';
    coordinates: [number, number] | [number, number, number];
}

export interface PageAffiliation {
    type: 'UniversityAffiliation' | 'CompanyAffiliation' | 'OtherAffiliation';
    organization?: string | null;
    major?: string[];
    degree?: string[];
    school?: string[];
    graduationYear?: number | null;
    specialty?: string[];
    category?: string[];
    title?: string;
    startYear?: number | null;
    endYear?: number | null;
    office?: string[];
    group?: string[];
    customField1?: string[];
    customField2?: string[];
    customField3?: string[];
    customField4?: string[];
    customField5?: string[];
    fieldGroupId:
        | 'primaryDegrees'
        | 'additionalDegrees'
        | 'primaryJobs'
        | 'additionalJobs'
        | 'primaryAffiliations'
        | 'additionalAffiliations'
        | 'residencies'
        | 'fellowships'
        | 'training';
}

interface PageElement {
    id: string;
    type:
        | 'Question'
        | 'StatusUpdate'
        | 'Offer'
        | 'People'
        | 'Places'
        | 'Memories'
        | 'CampusLife'
        | 'Obituary'
        | 'CustomQuestion1'
        | 'CustomQuestion2'
        | 'CustomQuestion3'
        | 'CustomQuestion4'
        | 'CustomQuestion5';
    answers: Answer[];
}

export interface Answer {
    id: string;
    type: 'text' | 'value';
    text?: string;
}

interface Section {
    questionId: string;
    fieldId: string;
    headline: string;
    content: string;
    isPrimary: boolean;
    subheaders: Subheader[];
}

export interface Subheader {
    type: 'UniversityAffiliation' | 'CompanyAffiliation' | 'OtherAffiliation' | 'CurrentLocation' | 'CurrentCity' | 'HomeTown';
    subtype: string;
    value: string;
    isSecondary: boolean;
}

interface Mention {
    pageAlias: string;
    name: string;
    questionId: string;
    fieldId: string;
    pictureId?: string | null;
}
