export interface UserRole {
    id: string;
    type: 'ADMINISTRATOR' | 'CLERK' | 'APPROVER' | 'ACCOUNTANT' | 'CUSTOM' | 'PAYER' | 'PARTNER' | 'AUDITOR' | 'NO_ACCESS';
    description?: string;
    createdTime?: string;
    updatedTime?: string;
}

export interface BillUser {
    id: string;
    archived: boolean;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    createdTime: string;
    updatedTime: string;
}

export interface BillCreateUserInput {
    firstName: string;
    lastName: string;
    email: string;
    roleId: string;
    acceptTermsOfService: boolean;
}

export interface RoleResponse {
    results: UserRole[];
}
