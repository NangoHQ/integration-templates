// ---------------------------
// This file was generated by Nango (v0.58.7)
// You can version this file
// ---------------------------

export interface IdEntity {
    id: string;
}

export interface SuccessResponse {
    success: boolean;
}

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
}

export interface PhoneNumber {
    type: 'work' | 'mobile' | 'other';
    value: string;
}

export interface Contact {
    id: string;
    firstName: string | undefined;
    lastName: string | undefined;
    email: string | undefined;
    phoneNumbers?: PhoneNumber[] | undefined;
    company: string | undefined;
    jobTitle: string | undefined;
    notes: string | undefined;
}

export interface CreateContact {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumbers?: PhoneNumber[];
    company?: string;
    jobTitle?: string;
    notes?: string;
}

export interface CompanyInfo {
    id: string;
    name: string;
    status: string;
    serviceInfo: { brand: { id: string; name: string }; servicePlan: { id: string; name: string } };
    mainNumber: string | undefined;
    operator: { id: string | undefined; extensionNumber: string | undefined };
}

export interface CreateUser {
    firstName: string;
    lastName: string;
    email: string;
}

export interface Photo {
    type: 'photo';
    value: string;
}

export interface Address {
    type: 'work';
    streetAddress?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
    country?: string;
}

export interface RingCentralCreateUser {
    firstName: string;
    lastName: string;
    email: string;
    active?: boolean;
    externalId?: string;
    phoneNumbers?: PhoneNumber[];
    photos?: Photo[];
    addresses?: Address[];
    title?: string;
    'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'?: { department: string };
}
