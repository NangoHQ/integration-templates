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

export interface RingCentralContactResponse {
    uri: string;
    records: RingCentralContactRecord[];
    paging: {
        page: number;
        totalPages: number;
        perPage: number;
        totalElements: number;
        pageStart: number;
        pageEnd: number;
    };
    navigation: {
        firstPage: { uri: string };
        lastPage: { uri: string };
        nextPage?: { uri: string };
        previousPage?: { uri: string };
    };
}

export interface RingCentralContactRecord {
    id: number;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumbers?: PhoneNumber[];
    company?: string;
    jobTitle?: string;
    notes?: string;
}

export interface RingCentralCompanyResponse {
    uri: string;
    id: string;
    name: string;
    status: string;
    serviceInfo: {
        uri: string;
        brand: {
            id: string;
            name: string;
        };
        servicePlan: {
            id: string;
            name: string;
        };
    };
    mainNumber?: string;
    operator?: {
        uri?: string;
        id?: string;
        extensionNumber?: string;
    };
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
