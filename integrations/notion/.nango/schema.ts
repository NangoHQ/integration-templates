// ---------------------------
// This file was generated by Nango (v0.58.7)
// You can version this file
// ---------------------------

export interface SuccessResponse {
    success: boolean;
}

export interface Property {
    propertyKey: string;
    notionValue: any;
}

export interface CreateDatabaseRowOutput {
    success: boolean;
    addedProperties: Property[];
}

export interface RichPageInput {
    pageId: string;
}

export interface ContentMetadata {
    id: string;
    path?: string;
    type: 'page' | 'database';
    last_modified: string;
    title?: string;
    parent_id?: string | undefined;
}

export interface RichPage {
    id: string;
    path: string;
    title: string;
    content: string;
    contentType: string;
    meta: Record<string, any>;
    last_modified: string;
    parent_id?: string | undefined;
}

export interface DatabaseInput {
    databaseId: string;
}

export interface CreateDatabaseRowInput {
    databaseId: string;
    properties: Record<string, any>;
}

export interface RowEntry {
    id: string;
    row: { [key: string]: any };
}

export interface Database {
    id: string;
    path: string;
    title: string;
    meta: Record<string, any>;
    last_modified: string;
    entries: RowEntry[];
}

export interface NotionCompleteDatabase {
    id: string;
    row: { [key: string]: any };
    meta: { databaseId: string; path: string; title: string; last_modified: string };
}

export interface UrlOrId {
    url?: string;
    id?: string;
}

export interface User {
    id: string;
    email: string | null;
    firstName: string;
    lastName: string;
    isBot: boolean;
}
