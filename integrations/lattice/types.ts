export interface Manager {
    id: string;
    object: string;
    url: string;
}

export interface DirectReports {
    id: string;
    object: string;
}

export interface Tasks {
    object: string;
    url: string;
}

export interface LatticeUser {
    id: string;
    object: string;
    url: string;
    manager: Manager;
    directReports: DirectReports;
    department?: Manager;
    name?: string;
    preferredName?: string;
    email: string;
    tasks: Tasks;
    title: string;
    status: 'ACTIVE' | 'INVITED' | 'CREATED' | 'DEACTIVATED';
    startDate?: Date;
    birthDate?: Date;
    timezone?: string;
    gender?: 'Female' | 'Male' | 'NonBinary' | 'NotSet';
    isAdmin: boolean;
    externalUserId?: string;
    createdAt?: number;
    updatedAt?: number;
    customAttributes: Tasks;
}
