// Oracle HCM API response type for a worker
export interface OracleHcmEmployeeResponse {
    // Add only the fields needed for mapping to StandardEmployee. Expand as needed.
    PersonId: string;
    DisplayName: string;
    FirstName: string;
    LastName: string;
    WorkEmail: string;
    PersonNumber?: string;
    Title?: string;
    DepartmentId?: string;
    DepartmentName?: string;
    AssignmentStatusType?: string;
    StartDate?: string;
    TerminationDate?: string;
    ManagerId?: string;
    ManagerName?: string;
    WorkLocationName?: string;
    WorkLocationType?: string;
    WorkLocationAddress?: {
        Street?: string;
        City?: string;
        State?: string;
        Country?: string;
        PostalCode?: string;
    };
    Addresses?: Array<{
        Street?: string;
        City?: string;
        State?: string;
        Country?: string;
        PostalCode?: string;
        Type?: string;
    }>;
    Phones?: Array<{
        Type?: string;
        Number?: string;
    }>;
    Emails?: Array<{
        Type?: string;
        Address?: string;
    }>;
    // Provider-specific fields
    [key: string]: any;
}
