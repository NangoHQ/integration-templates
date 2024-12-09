export interface EmailEntity {
    email: string;
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

export interface DialpadCreateUser extends CreateUser {
    license?: string;
    officeId?: string;
    autoAssign?: boolean;
}
