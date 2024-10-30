export interface TrelloUser {
    id: string;
    schemas: string[];
    meta: Meta;
    userName: string;
    name: Name;
    displayName: string;
    profileUrl: string;
    userType: string;
    locale: string;
    active: boolean;
    emails: Email[];
    roles: Role[];
}

interface Meta {
    resourceType: string;
    created: string;
    location: string;
    trelloType: string;
}

interface Name {
    formatted: string;
    givenName: string;
    familyName: string;
}

interface Email {
    value: string;
    primary: boolean;
}

interface Role {
    value: string;
    display: string;
}
