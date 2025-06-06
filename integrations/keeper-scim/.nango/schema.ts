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

export interface CreateUser {
    firstName: string;
    lastName: string;
    email: string;
}

export interface PhoneNumber {
    type: 'work' | 'mobile' | 'other';
    value: string;
}

export interface Photo {
    type: 'photo' | 'thumbnail';
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

export interface KeeperCreateUser {
    firstName: string;
    lastName: string;
    email: string;
    active?: boolean;
    externalId?: string;
    phoneNumbers?: PhoneNumber[];
    photos?: Photo[];
    addresses?: Address[];
    title?: string;
}
