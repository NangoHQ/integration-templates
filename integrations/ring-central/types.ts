export interface RingCentralUser {
    id: string;
    schemas: string[];
    externalId: string;
    userName: string;
    name: Name;
    emails: Email[];
    photos: Photo[];
    phoneNumbers: PhoneNumber[];
    addresses: Address[];
    title: string;
    active: boolean;
    'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': UrnIetfParamsScimSchemasExtensionEnterprise20User;
}

interface Name {
    familyName: string;
    givenName: string;
}

interface Email {
    type: 'work';
    value: string;
}

interface Photo {
    type: 'photo';
    value: string;
}

interface Address {
    type: 'work';
    streetAddress: string;
    locality: string;
    region: string;
    postalCode: string;
    country: string;
}

interface PhoneNumber {
    type: 'work' | 'mobile' | 'other';
    value: string;
}

interface UrnIetfParamsScimSchemasExtensionEnterprise20User {
    department: string;
}
