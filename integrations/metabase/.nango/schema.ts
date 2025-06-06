// ---------------------------
// This file was generated by Nango (v0.58.7)
// You can version this file
// ---------------------------

export interface SuccessResponse {
    success: boolean;
}

export interface IdEntity {
    id: number;
}

export interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    active?: boolean;
}

export interface CreateUser {
    firstName: string;
    lastName: string;
    email: string;
}

export interface UpdateUserInput {
    id: number;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    is_group_manager: boolean | null;
    locale: string | null;
    is_superuser: boolean | null;
}
