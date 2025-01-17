export interface ScimUser {
    id: string;
    userName: string;
    name: {
        givenName: string;
        middleName?: string;
        familyName?: string;
        formatted?: string;
    };
    emails: {
        value: string;
        type: string;
        primary?: boolean;
    }[];
    phoneNumbers?: {
        value: string;
        type: string;
        primary?: boolean;
    }[];
    active: boolean;
    externalId?: string;
    meta: {
        resourceType: string;
        created: string;
        lastModified: string;
        location: string;
    };
    [key: string]: any;
}
