export interface PaycomEmployee {
  eecode: string;
  eename: string;
  firstname: string;
  lastname: string;
  middlename?: string;
  gender: string;
  streetaddr: string;
  apt_suite_other?: string;
  cityaddr: string;
  clockseq: string;
  eebadge: string;
  zipcode: string;
  homestate: string;
  homephone: string;
  homephone_country_code?: string | null;
  country_paid_in: string;
  eestatus: string;
  deptcode: string;
  deptdesc: string;
  cat1: string;
  cat1desc: string;
  cat2: string;
  cat2desc: string;
  cat3: string;
  cat3desc: string;
  cat4: string;
  cat4desc: string;
  cat5?: string;
  cat5desc?: string;
  cat6?: string;
  cat6desc?: string;
  cat7?: string;
  cat7desc?: string;
  cat8?: string;
  cat8desc?: string;
  cat9?: string;
  cat9desc?: string;
  cat10?: string;
  cat10desc?: string;
  cat11?: string;
  cat11desc?: string;
  cat12?: string;
  cat12desc?: string;
  cat13?: string;
  cat13desc?: string;
  cat14?: string;
  cat14desc?: string;
  cat15?: string;
  cat15desc?: string;
  cat16?: string;
  cat16desc?: string;
  cat17?: string;
  cat17desc?: string;
  cat18?: string;
  cat18desc?: string;
  cat19?: string;
  cat19desc?: string;
  cat20?: string;
  cat20desc?: string;
}

export interface PaycomDetailedEmployee {
  // Basic employee info
  employee_code: string;
  employee_name: string;
  firstname: string;
  lastname: string;
  middlename: string;
  nickname: string;
  business_title: string;
  employee_status: string;

  // Contact information
  personal_email: string;
  work_email: string;
  primary_phone: number;
  primary_phone_type: number;
  secondary_phone: number;
  secondary_phone_type: number;

  // Address information
  street: string;
  city: string;
  state: string;
  zipcode: string;

  // Employment details
  hire_date: string;
  termination_date: string;
  termination_reason: string;
  termination_type: string;
  rehire_date: string;
  previous_termination_date: string;
  last_position_change_date: string;
  last_pay_change: string;
  last_review: string;
  next_review: string;
  seniority_date: string;
  leave_start: string;
  leave_end: string;

  // Position and department
  position: string;
  position_code: string;
  position_title: string;
  position_id: string;
  position_level: string;
  position_family: string;
  position_family_code: string;
  position_family_name: string;
  position_seat_number: string;
  position_seat_title: string;
  department_code: string;
  department_description: string;

  // Supervisor information
  supervisor_primary: string;
  supervisor_primary_code: string;
  supervisor_secondary: string;
  supervisor_secondary_code: string;
  supervisor_tertiary: string;
  supervisor_tertiary_code: string;
  supervisor_quaternary: string;
  supervisor_quaternary_code: string;
  supervisor_approval: string;
  supervisor_approval_code: string;
  supervisor_talent: string;
  supervisor_talent_management: string;

  // Pay and benefits
  annual_salary: number;
  hourly_salary: number;
  pay_frequency: string;
  pay_class: string;
  hourly_or_salary: boolean;
  has_direct_deposit: boolean;
  retirement_plan: boolean;
  participation_401k: string;
  eligible_401k: string;
  match_eligible: string;
  hours_401k: number;
  part_num_401k: string;

  // Employment type
  fulltime_or_parttime: number;
  employee_type_1099: boolean;
  statutory_employee: boolean;
  non_resident_alien: boolean;
  highly_comp_employee: number;
  current_key_employee: boolean;
  exempt_status: string;

  // Personal information
  birth_date: string;
  gender: string;
  ethnic_background: string;
  actual_marital_status: string;
  actual_marital_status_description: string;
  age: number;

  // Emergency contacts
  emergency_1_contact: string;
  emergency_1_phone: number;
  emergency_1_relationship: string;
  emergency_2_contact: string;
  emergency_2_phone: number;
  emergency_2_relationship: string;
  emergency_3_contact: string;
  emergency_3_phone: number;
  emergency_3_relationship: string;

  // Additional fields
  employee_badge: number;
  employee_gl_code: string;
  employee_added: string;
  employee_supervisor_level: string;
  employee_supervisor_pin: string;
  employee_terminal_group: string;
  employee_terminal_group_description: string;
  location: string;
  schedule_group: number;
  schedule_time_zone: string;
  primary_schedule_group_description: string;
  length_of_service_since_hire: string;
  length_of_service_since_rehire: string;
  new_hire: boolean;
  new_hire_report_date: string;
  report_new_hire: boolean;
  parttime_to_fulltime_date: string;
  most_recent_check_date: string;
  print_ee_message: boolean;
  ee_message: string;

  // Additional fields from the detailed response
  [key: string]: any;
}

export interface PaycomEmployeeResponse {
  employees: PaycomEmployee[];
}
