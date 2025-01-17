export interface LucidUser {
    id: string;
    schemas: string[];
    userName: string;
    displayName: string;
    name: Name;
    emails: Email[];
    active: boolean;
    'urn:ietf:params:scim:schemas:extension:lucid:1.0:User'?: LucidExtension;
    meta?: Meta;
    roles?: string;
}

interface Name {
    formatted: string;
    givenName: string;
    familyName: string;
}

interface Email {
    value: string;
    primary?: boolean;
}

interface LucidExtension {
    productLicenses?: string[];
}

interface Meta {
    created?: string;
    lastModified?: string;
}
