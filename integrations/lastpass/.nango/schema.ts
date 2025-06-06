// ---------------------------
// This file was generated by Nango (v0.58.7)
// You can version this file
// ---------------------------

export interface EmailEntity {
    email: string;
}

export interface SuccessResponse {
    success: boolean;
}

export interface ActionResponseError {
    message: string;
}

export interface CreateUser {
    firstName: string;
    lastName: string;
    email: string;
}

export interface LastPassCreateUser {
    firstName: string;
    lastName: string;
    email: string;
    groups?: string[];
    duousername?: string;
    securidusername?: string;
    password?: string;
    password_reset_required?: boolean;
}

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}
