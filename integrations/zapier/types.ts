export interface ZapierUser {
    id: string;
    userName: string;
    name: {
        givenName: string | null;
        middleName?: string | null;
        familyName?: string | null;
        formatted?: string | null;
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
