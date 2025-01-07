export interface JiraIssueResponse {
    expand: string;
    id: string;
    self: string;
    key: string;
    fields: IssueFields;
    editmeta?: EditMeta;
}

interface IssueFields {
    summary: string;
    issuetype: IssueType;
    created: string;
    project: Project;
    description: AtlassianDocument | null;
    reporter: User;
    comment: CommentResponse;
    assignee: User | null;
    updated: string;
    status: Status;
    [key: string]: any;
}

export interface AtlassianDocument {
    version: number;
    type: string;
    content: AtlassianContent[];
}

interface AtlassianContent {
    type: string;
    content?: AtlassianContent[];
    text?: string;
}

interface IssueType {
    self: string;
    id: string;
    description: string;
    iconUrl: string;
    name: string;
    subtask: boolean;
    avatarId: number;
    entityId: string;
    hierarchyLevel: number;
    scope?: Scope;
}

interface Scope {
    project: Project;
    type: string;
}

interface Project {
    self: string;
    id: string;
    key: string;
    name: string;
    projectTypeKey: 'software' | 'service_desk' | 'business';
    simplified: boolean;
    avatarUrls: AvatarUrls;
    projectCategory?: ProjectCategory;
}

interface ProjectCategory {
    description: string;
    id: string;
    name: string;
    self: string;
}
interface AvatarUrls {
    '48x48': string;
    '24x24': string;
    '16x16': string;
    '32x32': string;
}

export interface User {
    self: string;
    accountId: string;
    emailAddress?: string; // Can be optional with bot
    avatarUrls: AvatarUrls;
    displayName: string;
    active: boolean;
    timeZone: string;
    accountType: string;
    applicationRoles?: ApplicationRoles;
    groups?: Groups;
    key?: string;
    name?: string;
    locale?: string | null;
}

interface ApplicationRoles {
    items: any[];
    size: number;
}

interface Groups {
    items: any[];
    size: number;
}

interface CommentResponse {
    comments: Comment[];
    self: string;
    maxResults: number;
    total: number;
    startAt: number;
}

interface Comment {
    self: string;
    id: string;
    author?: User; // Can be optional (i.e: user is a bot)
    body: any;
    updateAuthor: User;
    created: string;
    updated: string;
    jsdPublic: boolean;
    jsdAuthorCanSeeRequest?: boolean;
    properties?: CommentProperty[];
    renderedBody?: string;
    visibility?: CommentVisibility;
}

interface CommentVisibility {
    identifier: string;
    type: string;
    value: string;
}

interface CommentProperty {
    key: string;
    value: any;
}

interface Status {
    self: string;
    description: string;
    iconUrl: string;
    name: string;
    id: string;
    statusCategory: StatusCategory;
}

interface StatusCategory {
    self: string;
    id: number;
    key: string;
    colorName: string;
    name: string;
}

export interface JiraAccessibleResource {
    id: string;
    url: string;
    name: string;
    scopes: string[];
    avatarUrl: string;
}

export interface JiraProjectResponse {
    expand: string;
    self: string;
    id: string;
    key: string;
    name: string;
    avatarUrls: AvatarUrls;
    projectTypeKey: 'software' | 'service_desk' | 'business';
    simplified: boolean;
    style: string;
    isPrivate: boolean;
    properties: object;
    entityId?: string;
    uuid?: string;
}

export interface JiraIssueType {
    avatarId: number;
    description?: string;
    entityId: string;
    hierarchyLevel: number;
    iconUrl: string;
    id: string;
    name: string;
    scope: Scope;
    self: string;
    subtask: boolean;
}

export interface CreateJiraIssue {
    fields: CreateIssueFields;
}

export interface CreateIssueFields {
    summary: string;
    description?: AtlassianDocument;
    assignee?: {
        id: string;
    };
    issuetype: {
        id: string;
    };
    project: {
        id: string;
    };
    labels?: string[];
}

interface EditMeta {
    fields: Record<string, EditMetaField>;
}

export interface EditMetaField {
    required: boolean;
    schema: FieldSchema;
    name: string;
    key: string;
    operations: string[];
    allowedValues?: AllowedValue[];
    autoCompleteUrl?: string;
    hasDefaultValue?: boolean;
}

interface FieldSchema {
    type: string;
    system?: string;
    custom?: string;
    customId?: number;
    items?: string;
    configuration?: Record<string, any>;
}

interface AllowedValue {
    self: string;
    id: string;
    description?: string;
    iconUrl?: string;
    name: string;
    subtask?: boolean;
    avatarId?: number;
    hierarchyLevel?: number;
}
