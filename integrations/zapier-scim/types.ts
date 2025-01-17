export interface ScimUser {
    id: string;
    userName: string;
    name: {
        givenName: string;
        middleName?: string;
        formatted?: string;
    };
    emails: Array<{
        value: string;
        type: string;
    }>;
    phoneNumbers?: Array<{
        value: string;
        type: string;
        primary?: boolean;
    }>;
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
