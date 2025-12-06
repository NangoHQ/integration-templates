export interface EmployeeDetails {
    id: number;
    employee_id: string;
    username: string;
    first_name: string;
    last_name: string;
    _links: {
        self: string;
        demographics: string;
        badges: string;
        'pay-info': string;
        profiles: string;
    };
    status: string;
    dates: {
        hired: string;
        started: string;
    };
}

export interface ChangedEmployeeDetails {
    id: number;
    object: EmployeeDetails;
    status: 'MODIFIED' | 'DELETED';
}

export interface SingleEmployeeResponse {
    id: number;
    employee_id: string;
    username: string;
    first_name: string;
    last_name: string;
    _links: {
        self: string;
        demographics: string;
        badges: string;
        'pay-info': string;
        profiles: string;
    };
    photo_href: string;
    isPhotoUploaded: boolean;
    middle_name: string;
    status: string;
    locked: boolean;
    force_change_password: boolean;
    nickname: string;
    primary_email: string;
    suffix: string;
    first_screen: {
        id: string;
    };
    address: {
        address_line_1: string;
        address_line_2: string;
        country: string;
        city: string;
        state: string;
        zip: string;
    };
    use_separate_mailing_address: boolean;
    timezone: string;
    phones: {
        cell_phone_country_id: string;
        cell_phone_country_code: string;
        cell_phone: string;
        home_phone_country_id: string;
        home_phone_country_code: string;
        home_phone: string;
        work_phone_country_id: string;
        work_phone_country_code: string;
        work_phone: string;
        preferred_phone: string;
    };
    dates: {
        hired: string;
        started: string;
        birthday?: string; // Optional field
    };
    managers: {
        index: number;
        empl_ref: {
            account_id: number;
        };
    }[];
    cost_centers_info: {
        defaults: {
            index: number;
            value: {
                id: number;
            };
        }[];
        limits: {
            index: number;
            values: {
                id: number;
                effective_from: string;
                type: string;
            }[];
        }[];
    };
    ein: {
        id: number;
    };
    add_to_new_hire_export: boolean;
    hardware_settings: {
        in_touch: {
            security_level: string;
            pin: number;
        };
    };
    managed_cost_centers_enabled: boolean;
    national_id_numbers: {
        type: string;
        primary: boolean;
        value: string;
    }[];
}
