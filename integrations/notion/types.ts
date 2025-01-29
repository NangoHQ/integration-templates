export interface Annotations {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color:
        | 'default'
        | 'gray'
        | 'brown'
        | 'orange'
        | 'yellow'
        | 'green'
        | 'blue'
        | 'purple'
        | 'pink'
        | 'red'
        | 'gray_background'
        | 'brown_background'
        | 'orange_background'
        | 'yellow_background'
        | 'green_background'
        | 'blue_background'
        | 'purple_background'
        | 'pink_background'
        | 'red_background';
}

export type CalloutIcon =
    | { type: 'emoji'; emoji?: string }
    | { type: 'external'; external?: { url: string } }
    | { type: 'file'; file: { url: string; expiry_time: string } }
    | null;

interface User {
    object: string;
    id: string;
}

interface Text {
    content: string;
    link: null;
}

export interface TitleElement {
    type: string;
    text: Text;
    annotations: Annotations;
    plain_text: string;
    href: null;
}

interface TitleProperty {
    id: string;
    type: string;
    title: TitleElement[];
}

interface Properties {
    title: TitleProperty;
}

interface Parent {
    type: string;
    page_id?: string;
    workspace?: boolean;
}

interface Icon {
    type: string;
    emoji?: string;
}

export interface BaseObject {
    id: string;
    cover: string | null;
    icon: Icon | null;
    created_time: string;
    created_by: User;
    last_edited_time: string;
    last_edited_by: User;
    url: string;
}

export interface Page extends BaseObject {
    object: 'page';
    parent: Parent;
    archived: boolean;
    in_trash: boolean;
    properties: Properties;
    public_url: null;
}

export interface Database extends BaseObject {
    object: 'database';
    title: TitleElement[];
    parent: Parent;
    description: TitleElement[];
    properties: Record<string, any>;
}

export interface NotionGetDatabaseResponse {
    object: 'database';
    id: string;
    properties?: Record<string, unknown>;
}

export interface NotionCreatePageResponse {
    object: 'page';
    id: string;
}

export interface BlockPage {
    object: 'block';
    id: string;
    parent: Parent;
    created_time: string;
    last_edited_time: string;
    created_by: User;
    has_children: boolean;
    archived: boolean;
    in_trash: boolean;
    type: string;
    child_page: {
        title: string;
    };
}

export interface NotionUser {
    object: string;
    id: string;
    name: string;
    avatar_url: string | null;
    type: 'bot' | 'person';
    bot?: {
        owner?: {
            type: string;
            user?: NotionUser;
        };
        workspace_name: string;
    };
    person?: {
        email: string;
    };
}
