export interface GustoCreateEmployee {
    first_name: string;
    middle_initial?: string;
    last_name: string;
    email: string;
    date_of_birth?: string;
    preferred_first_name?: string;
    ssn?: string;
    self_onboarding?: boolean;
}

export interface GustoDeleteEmployee {
    effective_date?: string | undefined;
    run_termination_payroll?: boolean;
}

export interface GustoEmployee {
    uuid: string;
    first_name: string;
    middle_initial: string | null;
    last_name: string;
    email: string;
    company_uuid: string;
    manager_uuid: string;
    version: string;
    department: string;
    department_uuid: string;
    terminated: boolean;
    two_percent_shareholder: boolean;
    onboarded: boolean;
    onboarding_status: string;
    jobs: Job[];
    eligible_paid_time_off: PaidTimeOff[];
    terminations: any[];
    custom_fields: CustomField[];
    garnishments: any[];
    date_of_birth: string;
    has_ssn: boolean;
    ssn: string;
    phone: string;
    preferred_first_name: string;
    work_email: string;
}

interface Job {
    uuid: string;
    version: string;
    employee_uuid: string;
    current_compensation_uuid: string;
    payment_unit: string;
    primary: boolean;
    title: string;
    compensations: Compensation[];
    rate: string;
    hire_date: string;
}

interface Compensation {
    uuid: string;
    version: string;
    payment_unit: string;
    flsa_status: string;
    job_uuid: string;
    effective_date: string;
    rate: string;
    adjust_for_minimum_wage: boolean;
    minimum_wages: any[];
}

interface PaidTimeOff {
    name: string;
    policy_name: string;
    policy_uuid: string;
    accrual_unit: string;
    accrual_rate: string;
    accrual_method?: string;
    accrual_period: string;
    accrual_balance: string;
    maximum_accrual_balance: string;
    paid_at_termination: boolean;
}

interface CustomField {
    id: string;
    company_custom_field_id: string;
    name: string;
    description: string;
    type: string;
    value: string;
    selection_options: string[] | null;
}

export interface Termination {
    uuid: string;
    version: string;
    employee_uuid: string;
    active: boolean;
    cancelable: boolean;
    effective_date: string;
    run_termination_payroll: boolean;
}

export type CurrentEmploymentStatus = 'full_time' | 'part_time_under_twenty_hours' | 'part_time_twenty_plus_hours' | 'variable' | 'seasonal';

export interface EmployeeResponse {
    uuid: string;
    first_name: string;
    middle_initial: string | null;
    last_name: string;
    email: string;
    company_uuid: string;
    manager_uuid: string;
    version: string;
    department: string;
    department_uuid: string;
    terminated: boolean;
    two_percent_shareholder: boolean;
    onboarded: boolean;
    onboarding_status: string;
    jobs: Job[];
    eligible_paid_time_off: PaidTimeOff[];
    terminations: Termination[];
    garnishments: any[];
    custom_fields?: CustomField[];
    date_of_birth: string;
    has_ssn: boolean;
    ssn: string;
    phone: string;
    preferred_first_name: string;
    work_email: string;
    current_employment_status: CurrentEmploymentStatus | null;
}
