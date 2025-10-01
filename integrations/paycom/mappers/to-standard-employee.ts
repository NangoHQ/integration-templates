import type {
  StandardEmployee,
  Phone,
  Email,
  Address,
  Person,
} from "../models.js";
import type { PaycomEmployee, PaycomDetailedEmployee } from "../types.js";
import { parseDate } from "../helpers/utils.js";

/**
 * Maps employment type based on Paycom employee status
 */
function mapEmploymentType(
  status: string | undefined,
): StandardEmployee["employmentType"] {
  if (!status) return "OTHER";

  switch (status.toUpperCase()) {
    case "ACTIVE":
    case "FULL_TIME":
      return "FULL_TIME";
    case "PART_TIME":
      return "PART_TIME";
    case "CONTRACTOR":
      return "CONTRACTOR";
    case "INTERN":
      return "INTERN";
    case "TEMPORARY":
      return "TEMPORARY";
    default:
      return "OTHER";
  }
}

/**
 * Maps employment status based on Paycom employee status
 */
function mapEmploymentStatus(
  status: string | undefined,
): StandardEmployee["employmentStatus"] {
  if (!status) return "PENDING";

  switch (status.toUpperCase()) {
    case "ACTIVE":
      return "ACTIVE";
    case "TERMINATED":
      return "TERMINATED";
    case "ON_LEAVE":
      return "ON_LEAVE";
    case "SUSPENDED":
      return "SUSPENDED";
    default:
      return "PENDING";
  }
}

/**
 * Extracts first and last name from employee name
 */
function parseEmployeeName(employeeName: string): {
  firstName: string;
  lastName: string;
} {
  const nameParts = employeeName.trim().split(" ");
  if (nameParts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  if (nameParts.length === 1) {
    return { firstName: nameParts[0] || "", lastName: "" };
  }
  if (nameParts.length === 2) {
    return { firstName: nameParts[0] || "", lastName: nameParts[1] || "" };
  }
  // For names with more than 2 parts, take first as first name and rest as last name
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ");
  return { firstName, lastName };
}

/**
 * Maps phone type from Paycom to standard format
 */
function mapPhoneType(phoneType: number): Phone["type"] {
  switch (phoneType) {
    case 1:
      return "WORK";
    case 2:
      return "HOME";
    case 3:
      return "MOBILE";
    default:
      return "WORK";
  }
}

/**
 * Converts Paycom employee data to StandardEmployee format (basic directory data)
 */
export function toStandardEmployee(employee: PaycomEmployee): StandardEmployee {
  const { firstName, lastName } = parseEmployeeName(employee.eename);

  const baseEmployee: StandardEmployee = {
    // Core fields
    id: employee.eecode || employee.eebadge?.toString() || "",
    firstName,
    lastName,
    email: "", // Paycom API doesn't provide email in this endpoint
    displayName: employee.eename || "",
    employeeNumber: employee.eebadge?.toString(),

    // Employment details
    title: "", // Not available in basic employee data
    department: {
      id: employee.deptcode || "unknown",
      name: employee.deptdesc || "Unknown Department",
    },
    employmentType: mapEmploymentType(employee.eestatus),
    employmentStatus: mapEmploymentStatus(employee.eestatus),
    startDate: "", // Not available in basic employee data
    terminationDate: null,
    terminationType: null,
    // Work location
    workLocation: {
      name: employee.cityaddr || "",
      type: "OFFICE",
      primaryAddress: {
        street: employee.streetaddr || "",
        city: employee.cityaddr || "",
        state: employee.homestate || "",
        country: "US", // Assuming US based on Paycom being US-focused
        postalCode: employee.zipcode || "",
        type: "WORK",
      },
    },

    // Personal details
    addresses: [
      {
        street: employee.streetaddr || "",
        city: employee.cityaddr || "",
        state: employee.homestate || "",
        country: "US",
        postalCode: employee.zipcode || "",
        type: "HOME",
      },
    ],
    phones: employee.homephone
      ? [
          {
            type: "HOME",
            number: employee.homephone,
          },
        ]
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
      : ([] as Phone[]),
     // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
    emails: [] as Email[],

    // Provider-specific data
    providerSpecific: {
      eecode: employee.eecode,
      eename: employee.eename,
      firstname: employee.firstname,
      lastname: employee.lastname,
      middlename: employee.middlename,
      gender: employee.gender,
      streetaddr: employee.streetaddr,
      apt_suite_other: employee.apt_suite_other,
      cityaddr: employee.cityaddr,
      clockseq: employee.clockseq,
      eebadge: employee.eebadge,
      zipcode: employee.zipcode,
      homestate: employee.homestate,
      homephone: employee.homephone,
      homephone_country_code: employee.homephone_country_code,
      country_paid_in: employee.country_paid_in,
      eestatus: employee.eestatus,
      deptcode: employee.deptcode,
      deptdesc: employee.deptdesc,
      cat1: employee.cat1,
      cat1desc: employee.cat1desc,
      cat2: employee.cat2,
      cat2desc: employee.cat2desc,
      cat3: employee.cat3,
      cat3desc: employee.cat3desc,
      cat4: employee.cat4,
      cat4desc: employee.cat4desc,
      cat5: employee.cat5,
      cat5desc: employee.cat5desc,
      cat6: employee.cat6,
      cat6desc: employee.cat6desc,
      cat7: employee.cat7,
      cat7desc: employee.cat7desc,
      cat8: employee.cat8,
      cat8desc: employee.cat8desc,
      cat9: employee.cat9,
      cat9desc: employee.cat9desc,
      cat10: employee.cat10,
      cat10desc: employee.cat10desc,
      cat11: employee.cat11,
      cat11desc: employee.cat11desc,
      cat12: employee.cat12,
      cat12desc: employee.cat12desc,
      cat13: employee.cat13,
      cat13desc: employee.cat13desc,
      cat14: employee.cat14,
      cat14desc: employee.cat14desc,
      cat15: employee.cat15,
      cat15desc: employee.cat15desc,
      cat16: employee.cat16,
      cat16desc: employee.cat16desc,
      cat17: employee.cat17,
      cat17desc: employee.cat17desc,
      cat18: employee.cat18,
      cat18desc: employee.cat18desc,
      cat19: employee.cat19,
      cat19desc: employee.cat19desc,
      cat20: employee.cat20,
      cat20desc: employee.cat20desc,
    },

    createdAt: "", // Not available in basic employee data
    updatedAt: "", // Not available in basic employee data
  };

  return baseEmployee;
}

/**
 * Converts Paycom detailed employee data to StandardEmployee format
 */
export function toStandardEmployeeDetailed(
  employee: PaycomDetailedEmployee,
): StandardEmployee {
  const firstName = employee.firstname || "";
  const lastName = employee.lastname || "";
  const displayName =
    employee.employee_name || `${firstName} ${lastName}`.trim();

  // Build phones array
  const phones: Phone[] = [];
  if (employee.primary_phone) {
    phones.push({
      type: mapPhoneType(employee.primary_phone_type),
      number: employee.primary_phone.toString(),
    });
  }
  if (employee.secondary_phone) {
    phones.push({
      type: mapPhoneType(employee.secondary_phone_type),
      number: employee.secondary_phone.toString(),
    });
  }

  // Build emails array
  const emails: Email[] = [];
  if (employee.work_email) {
    emails.push({ type: "WORK", address: employee.work_email });
  }
  if (employee.personal_email) {
    emails.push({ type: "PERSONAL", address: employee.personal_email });
  }

  // Build addresses array
  const addresses: Address[] = [];
  if (employee.street || employee.city || employee.state || employee.zipcode) {
    addresses.push({
      street: employee.street || "",
      city: employee.city || "",
      state: employee.state || "",
      country: "US",
      postalCode: employee.zipcode || "",
      type: "HOME",
    });
  }

  // Build manager information
  const manager: Person | undefined = employee.supervisor_primary_code
    ? {
        id: employee.supervisor_primary_code,
        firstName: employee.supervisor_primary?.split(" ")[0] || "",
        lastName:
          employee.supervisor_primary?.split(" ").slice(1).join(" ") || "",
        email: "", // Paycom doesn't provide supervisor email
      }
    : undefined;

  const baseEmployee: StandardEmployee = {
    // Core fields
    id: employee.employee_code || employee.employee_badge?.toString() || "",
    firstName,
    lastName,
    email: employee.work_email || employee.personal_email || "",
    displayName,
    employeeNumber: employee.employee_badge?.toString(),

    // Employment details
    title:
      employee.business_title ||
      employee.position_title ||
      employee.position ||
      "",
    department: {
      id: employee.department_code || "unknown",
      name: employee.department_description || "Unknown Department",
    },
    employmentType: mapEmploymentType(employee.employee_status),
    employmentStatus: mapEmploymentStatus(employee.employee_status),
    startDate: parseDate(employee.hire_date),
    terminationDate: parseDate(employee.termination_date),
    terminationType: employee.termination_type,
    ...(manager ? { manager } : {}),

    // Work location
    workLocation: {
      name: employee.location || employee.city || "",
      type: "OFFICE",
      primaryAddress: {
        street: employee.street || "",
        city: employee.city || "",
        state: employee.state || "",
        country: "US",
        postalCode: employee.zipcode || "",
        type: "WORK",
      },
    },

    // Personal details
    addresses,
    phones,
    emails,

    // Provider-specific data
    providerSpecific: {
      // Basic info
      employee_name: employee.employee_name,
      nickname: employee.nickname,
      middlename: employee.middlename,

      // Contact info
      personal_email: employee.personal_email,
      work_email: employee.work_email,
      primary_phone: employee.primary_phone,
      primary_phone_type: employee.primary_phone_type,
      secondary_phone: employee.secondary_phone,
      secondary_phone_type: employee.secondary_phone_type,

      // Employment details
      hire_date: employee.hire_date,
      termination_date: employee.termination_date,
      termination_reason: employee.termination_reason,
      termination_type: employee.termination_type,
      rehire_date: employee.rehire_date,
      previous_termination_date: employee.previous_termination_date,
      last_position_change_date: employee.last_position_change_date,
      last_pay_change: employee.last_pay_change,
      last_review: employee.last_review,
      next_review: employee.next_review,
      seniority_date: employee.seniority_date,
      leave_start: employee.leave_start,
      leave_end: employee.leave_end,

      // Position details
      position: employee.position,
      position_code: employee.position_code,
      position_title: employee.position_title,
      position_id: employee.position_id,
      position_level: employee.position_level,
      position_family: employee.position_family,
      position_family_code: employee.position_family_code,
      position_family_name: employee.position_family_name,
      position_seat_number: employee.position_seat_number,
      position_seat_title: employee.position_seat_title,

      // Supervisor details
      supervisor_primary: employee.supervisor_primary,
      supervisor_primary_code: employee.supervisor_primary_code,
      supervisor_secondary: employee.supervisor_secondary,
      supervisor_secondary_code: employee.supervisor_secondary_code,
      supervisor_tertiary: employee.supervisor_tertiary,
      supervisor_tertiary_code: employee.supervisor_tertiary_code,
      supervisor_quaternary: employee.supervisor_quaternary,
      supervisor_quaternary_code: employee.supervisor_quaternary_code,
      supervisor_approval: employee.supervisor_approval,
      supervisor_approval_code: employee.supervisor_approval_code,
      supervisor_talent: employee.supervisor_talent,
      supervisor_talent_management: employee.supervisor_talent_management,

      // Pay and benefits
      annual_salary: employee.annual_salary,
      hourly_salary: employee.hourly_salary,
      pay_frequency: employee.pay_frequency,
      pay_class: employee.pay_class,
      hourly_or_salary: employee.hourly_or_salary,
      has_direct_deposit: employee.has_direct_deposit,
      retirement_plan: employee.retirement_plan,
      participation_401k: employee.participation_401k,
      eligible_401k: employee.eligible_401k,
      match_eligible: employee.match_eligible,
      hours_401k: employee.hours_401k,
      part_num_401k: employee.part_num_401k,

      // Employment type
      fulltime_or_parttime: employee.fulltime_or_parttime,
      employee_type_1099: employee.employee_type_1099,
      statutory_employee: employee.statutory_employee,
      non_resident_alien: employee.non_resident_alien,
      highly_comp_employee: employee.highly_comp_employee,
      current_key_employee: employee.current_key_employee,
      exempt_status: employee.exempt_status,

      // Personal info
      birth_date: employee.birth_date,
      gender: employee.gender,
      ethnic_background: employee.ethnic_background,
      actual_marital_status: employee.actual_marital_status,
      actual_marital_status_description:
        employee.actual_marital_status_description,
      age: employee.age,

      // Emergency contacts
      emergency_1_contact: employee.emergency_1_contact,
      emergency_1_phone: employee.emergency_1_phone,
      emergency_1_relationship: employee.emergency_1_relationship,
      emergency_2_contact: employee.emergency_2_contact,
      emergency_2_phone: employee.emergency_2_phone,
      emergency_2_relationship: employee.emergency_2_relationship,
      emergency_3_contact: employee.emergency_3_contact,
      emergency_3_phone: employee.emergency_3_phone,
      emergency_3_relationship: employee.emergency_3_relationship,

      // Additional fields
      employee_badge: employee.employee_badge,
      employee_gl_code: employee.employee_gl_code,
      employee_added: employee.employee_added,
      employee_supervisor_level: employee.employee_supervisor_level,
      employee_supervisor_pin: employee.employee_supervisor_pin,
      employee_terminal_group: employee.employee_terminal_group,
      employee_terminal_group_description:
        employee.employee_terminal_group_description,
      location: employee.location,
      schedule_group: employee.schedule_group,
      schedule_time_zone: employee.schedule_time_zone,
      primary_schedule_group_description:
        employee.primary_schedule_group_description,
      length_of_service_since_hire: employee.length_of_service_since_hire,
      length_of_service_since_rehire: employee.length_of_service_since_rehire,
      new_hire: employee.new_hire,
      new_hire_report_date: employee.new_hire_report_date,
      report_new_hire: employee.report_new_hire,
      parttime_to_fulltime_date: employee.parttime_to_fulltime_date,
      most_recent_check_date: employee.most_recent_check_date,
      print_ee_message: employee.print_ee_message,
      ee_message: employee.ee_message,
    },

    createdAt: parseDate(employee.hire_date),
    updatedAt: parseDate(employee.employee_added),
  };

  return baseEmployee;
}
