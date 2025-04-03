export interface Field {
    id: string | number;
    name: string;
    type: string;
    alias?: string;
}

export interface Option {
    id: number;
    archived: string;
    createdDate: string | null;
    archivedDate: string | null;
    name: string;
}

export interface ListField {
    fieldId: number;
    manageable: string;
    multiple: string;
    name: string;
    options: Option[];
    alias?: string;
}

export interface BambooHrEmployee {
    id: string;
    employeeNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    address1: string;
    bestEmail: string;
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
    workEmail: string;
    workPhone: string;
    homePhone: string;
}

export interface BamboohrEmployeeResponse {
    employees: BambooHrEmployee[];
}
