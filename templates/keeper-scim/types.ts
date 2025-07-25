export interface KeeperUser {
    id: string;
    schemas: string[];
    externalId: string;
    userName: string;
    displayName: string;
    name: Name;
    emails: Email[];
    photos?: Photo[];
    phoneNumbers?: PhoneNumber[];
    addresses?: Address[];
    title?: string;
    active: boolean;
}

interface Name {
    familyName: string;
    givenName: string;
}

interface Email {
    type: string;
    value: string;
    primary: boolean;
}

interface Photo {
    type: string;
    value: string;
}

interface Address {
    type: string;
    streetAddress: string;
    locality: string;
    region: string;
    postalCode: string;
    country: string;
}

interface PhoneNumber {
    type: string;
    value: string;
}
