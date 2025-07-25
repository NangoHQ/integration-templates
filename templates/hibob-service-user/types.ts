export interface HibobEmployeeResponse {
    id: string;
    firstName: string;
    surname: string;
    email: string;
    displayName: string;
    work?: {
        title?: string;
        department?: {
            id: string;
            name: string;
        };
        employmentType?: string;
        status?: string;
        startDate?: string;
        terminationDate?: string;
        reportsTo?: {
            id: string;
            firstName: string;
            surname: string;
            email: string;
        };
        site?: string;
        siteType?: string;
        address?: {
            street: string;
            city: string;
            state: string;
            country: string;
            postalCode: string;
        };
        customFields?: Record<string, any>;
    };
    personal?: {
        addresses?: {
            street: string;
            city: string;
            state: string;
            country: string;
            postalCode: string;
            type: string;
        }[];
        workPhone?: string;
        homePhone?: string;
        mobilePhone?: string;
        email?: string;
    };
    about?: {
        createdAt?: string;
        updatedAt?: string;
        [key: string]: any;
    };
}
