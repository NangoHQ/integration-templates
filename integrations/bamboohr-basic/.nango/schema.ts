// ---------------------------
// This file was generated by Nango (v0.61.2)
// You can version this file
// ---------------------------

export interface Option {
    id: number;
    name: string;
}

export interface BamboohrField {
    id: string;
    type: string;
    name: string;
    alias?: string;
    options?: Option[];
}

export interface BamboohrEmployee {
    id: string;
    employeeNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    address1: string;
    bestEmail: string;
    workEmail: string;
    jobTitle: string;
    hireDate: string;
    supervisorId: string;
    supervisor: string;
    createdByUserId: string;
    department: string;
    division: string;
    employmentHistoryStatus: string;
    gender: string;
    country: string;
    city: string;
    location: string;
    state: string;
    maritalStatus: string;
    exempt: string;
    payRate: string;
    payType: string;
    payPer: string;
    ssn: string;
    workPhone: string;
    homePhone: string;
}

export interface BamboohrCreateEmployee {
    firstName: string;
    lastName: string;
    employeeNumber?: string;
    dateOfBirth?: string;
    address1?: string;
    bestEmail?: string;
    workEmail?: string;
    jobTitle?: string;
    hireDate?: string;
    supervisorId?: string;
    supervisor?: string;
    createdByUserId?: string;
    department?: string;
    division?: string;
    employmentHistoryStatus?: string;
    gender?: string;
    country?: string;
    city?: string;
    location?: string;
    state?: string;
    maritalStatus?: string;
    exempt?: string;
    payRate?: string;
    payType?: string;
    payPer?: string;
    ssn?: string;
    workPhone?: string;
    homePhone?: string;
}

export interface BamboohrUpdateEmployee {
    id: string;
    firstName?: string;
    lastName?: string;
    employeeNumber?: string;
    dateOfBirth?: string;
    address1?: string;
    bestEmail?: string;
    workEmail?: string;
    jobTitle?: string;
    hireDate?: string;
    supervisorId?: string;
    supervisor?: string;
    createdByUserId?: string;
    department?: string;
    division?: string;
    employmentHistoryStatus?: string;
    gender?: string;
    country?: string;
    city?: string;
    location?: string;
    state?: string;
    maritalStatus?: string;
    exempt?: string;
    payRate?: string;
    payType?: string;
    payPer?: string;
    ssn?: string;
    workPhone?: string;
    homePhone?: string;
}

export interface BamboohrResponseStatus {
    status: string;
}

export interface BamboohrCreateEmployeeResponse {
    status: string;
    id: string;
}

export interface StandardEmployeeEmail {
    email: string;
    type: string;
}

export interface StandardEmployeeWorkingHours {
    days: string[];
    hours: string[];
    time_zone: string;
}

export interface StandardEmployeeAddress {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    type: string;
}

export interface StandardEmployeeLocation {
    name?: string;
    type: string;
    address?: StandardEmployeeAddress;
}

export interface StandardEmployeePhone {
    type: 'WORK' | 'HOME' | 'MOBILE';
    number: string;
}

export interface StandardEmployeeBankAccount {
    bank_name?: string;
    account_number?: string;
    routing_number?: string;
    type?: string;
    currency?: string;
}

export interface StandardEmployeeManager {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
}

export interface Address {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    type: 'WORK' | 'HOME';
}

export interface Phone {
    type: 'WORK' | 'HOME' | 'MOBILE';
    number: string;
}

export interface Email {
    type: 'WORK' | 'PERSONAL';
    address: string;
}

export interface StandardEmployee {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    displayName: string;
    employeeNumber?: string;
    title?: string;
    department: { id: string; name: string };
    employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'INTERN' | 'TEMPORARY' | 'OTHER';
    employmentStatus: 'ACTIVE' | 'TERMINATED' | 'ON_LEAVE' | 'SUSPENDED' | 'PENDING';
    startDate: string;
    terminationDate?: string | undefined;
    manager?: { id: string; firstName: string; lastName: string; email: string };
    workLocation: {
        name: string;
        type: 'OFFICE' | 'REMOTE' | 'HYBRID';
        primaryAddress?: { street?: string; city?: string; state?: string; country?: string; postalCode?: string; type: 'WORK' | 'HOME' };
    };
    addresses?: Address[];
    phones?: Phone[];
    emails?: Email[];
    providerSpecific: { [key: string]: any };
    createdAt: string;
    updatedAt: string;
}

/** @deprecated It is recommended to use a Model */
export type Anonymous_bamboohrbasic_action_fetchfields_output = BamboohrField[];
