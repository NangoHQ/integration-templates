// Oracle HCM API response type for a worker
export interface OracleHcmEmployeeResponse {
    // Add only the fields needed for mapping to StandardEmployee. Expand as needed.
    PersonId: string;
    DisplayName: string;
    FirstName?: string;
    LastName?: string;
    WorkEmail?: string;
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
    // Additional HRIS fields
    CorrespondenceLanguage?: string;
    BloodType?: string;
    DateOfBirth?: string;
    DateOfDeath?: string;
    CountryOfBirth?: string;
    RegionOfBirth?: string;
    TownOfBirth?: string;
    ApplicantNumber?: string;
    CreatedBy?: string;
    LastUpdatedBy?: string;
    CreationDate?: string;
    LastUpdateDate?: string;
    WorkLocationAddress?: {
        AddressLine1?: string;
        AddressLine2?: string;
        TownOrCity?: string;
        Region2?: string;
        Country?: string;
        PostalCode?: string;
    };
    addresses?: {
        items: OracleAddress[];
    };
    phones?: {
        items: OraclePhone[];
    };
    emails?: {
        items: OracleEmail[];
    };
    // Provider-specific fields
    [key: string]: any;
}

export interface OracleAddress {
    AddressLine1?: string;
    AddressLine2?: string;
    TownOrCity?: string;
    Region2?: string;
    Country?: string;
    PostalCode?: string;
    AddressType?: string;
    PrimaryFlag?: boolean;
}

export interface OraclePhone {
    PhoneType?: string;
    PhoneNumber?: string;
    PrimaryFlag?: boolean;
}

export interface OracleEmail {
    EmailType?: string;
    EmailAddress?: string;
    PrimaryFlag?: boolean;
}
