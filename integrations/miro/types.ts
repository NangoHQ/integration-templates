export interface MiroUser {
    schemas: string[];
    id: string;
    meta: Meta;
    userName: string;
    name: Name;
    displayName: string;
    active: boolean;
    emails: Email[];
}

interface Meta {
    resourceType: string;
    location: string;
}

interface Name {
    familyName: string;
    givenName: string;
}

interface Email {
    value: string;
    display: string;
    primary: boolean;
}

// TODO: double check on types
