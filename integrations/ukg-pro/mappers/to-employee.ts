import type { StandardEmployee, Person } from "../../models.js";
import type { EmployeeDetails } from "../types.js";
import { parseDate } from "../../helpers/utils.js";

/**
 * Sanitizes a string by trimming whitespace and converting null/undefined to an empty string.
 */
function sanitizeString(value?: string | null): string {
  return (value || "").trim();
}

/**
 * Maps a UKG Pro EmployeeDetails API response to the StandardEmployee model.
 */
export function toEmployee(response: EmployeeDetails): StandardEmployee {
  // Address mapping
  const workAddress = {
    type: "WORK" as const,
    street: sanitizeString(response.employeeAddress1),
    city: sanitizeString(response.city),
    state: sanitizeString(response.state),
    country: sanitizeString(response.countryCode),
    postalCode: sanitizeString(response.zipCode),
  };

  // Phone mapping
  const phones = [
    ...(sanitizeString(response.workPhone)
      ? [
          {
            type: "WORK" as const,
            number: sanitizeString(response.workPhone),
          },
        ]
      : []),
    ...(sanitizeString(response.homePhone)
      ? [
          {
            type: "HOME" as const,
            number: sanitizeString(response.homePhone),
          },
        ]
      : []),
  ];

  // Email mapping
  const emails = [
    ...(sanitizeString(response.emailAddress)
      ? [
          {
            type: "WORK" as const,
            address: sanitizeString(response.emailAddress),
          },
        ]
      : []),
    ...(sanitizeString(response.alternateEmailAddress)
      ? [
          {
            type: "PERSONAL" as const,
            address: sanitizeString(response.alternateEmailAddress),
          },
        ]
      : []),
  ];

  const middleName = sanitizeString(response.middleName);

  // Manager mapping (if supervisorId and supervisorName are present)
  const manager: Person | undefined =
    sanitizeString(response.supervisorId) &&
    sanitizeString(response.supervisorName)
      ? {
          id: sanitizeString(response.supervisorId),
          firstName: sanitizeString(response.supervisorName.split(" ")[0]),
          lastName: sanitizeString(
            response.supervisorName.split(" ").slice(1).join(" "),
          ),
          email: "",
        }
      : undefined;

  const employee: StandardEmployee = {
    id: sanitizeString(response.employeeId),
    firstName: sanitizeString(response.firstName),
    lastName: sanitizeString(response.lastName),
    email: sanitizeString(response.emailAddress),
    displayName: [
      sanitizeString(response.firstName),
      middleName,
      sanitizeString(response.lastName),
    ]
      .filter(Boolean)
      .join(" "),
    employeeNumber: String(response.employeeNumber),
    title: sanitizeString(response.alternateJobTitle),
    department: {
      id: sanitizeString(response.orgLevel1Code),
      name: sanitizeString(response.orgLevel1Code),
    },
    employmentType: mapEmploymentType(
      sanitizeString(response.employeeType),
      sanitizeString(response.fullTimeOrPartTime),
    ),
    employmentStatus: mapEmploymentStatus(
      sanitizeString(response.employeeStatus),
      response.isActive,
    ),
    startDate: parseDate(response.hireDate),
    terminationDate: parseDate(response.terminationDate),
    terminationType: response.isActive ? null : "INVOLUNTARY",
    workLocation: {
      name:
        sanitizeString(response.workLocation) ||
        sanitizeString(response.companyName),
      type: "OFFICE",
      primaryAddress: workAddress,
    },
    addresses: [workAddress],
    phones,
    emails,
    providerSpecific: {
      personId: sanitizeString(response.personId),
      userIntegrationKey: sanitizeString(response.userIntegrationKey),
      companyId: sanitizeString(response.companyId),
      salaryOrHourly: sanitizeString(response.salaryOrHourly),
      fullTimeOrPartTime: sanitizeString(response.fullTimeOrPartTime),
      jobCode: sanitizeString(response.jobCode),
      projectCode: sanitizeString(response.projectCode),
      orgLevel2Code: sanitizeString(response.orgLevel2Code),
      orgLevel3Code: sanitizeString(response.orgLevel3Code),
      orgLevel4Code: sanitizeString(response.orgLevel4Code),
      prefix: sanitizeString(response.prefix),
      suffix: sanitizeString(response.suffix),
      gender: sanitizeString(response.gender),
      emplStatusStartDate: parseDate(response.emplStatusStartDate),
      dateInJob: parseDate(response.dateInJob),
      dateOfLastHire: parseDate(response.dateOfLastHire),
      jobGroupCode: sanitizeString(response.jobGroupCode),
    },
    createdAt: parseDate(response.hireDate),
    updatedAt: parseDate(response.dateOfLastHire),
  };

  if (manager) {
    employee.manager = manager;
  }

  return employee;
}

/**
 * Maps UKG Pro employeeType and fullTimeOrPartTime to StandardEmployee.employmentType
 */
function mapEmploymentType(
  employeeType: string,
  fullTimeOrPartTime: string,
): StandardEmployee["employmentType"] {
  if (employeeType === "CONTRACTOR") return "CONTRACTOR";
  if (employeeType === "INTERN") return "INTERN";
  if (employeeType === "TEMPORARY") return "TEMPORARY";
  if (fullTimeOrPartTime === "P") return "PART_TIME";
  if (fullTimeOrPartTime === "F") return "FULL_TIME";
  return "OTHER";
}

/**
 * Maps UKG Pro employeeStatus and isActive to StandardEmployee.employmentStatus
 */
function mapEmploymentStatus(
  employeeStatus: string,
  isActive: boolean,
): StandardEmployee["employmentStatus"] {
  if (!isActive) return "TERMINATED";
  switch (employeeStatus) {
    case "ACTIVE":
      return "ACTIVE";
    case "ON_LEAVE":
      return "ON_LEAVE";
    case "SUSPENDED":
      return "SUSPENDED";
    case "PENDING":
      return "PENDING";
    default:
      return isActive ? "ACTIVE" : "TERMINATED";
  }
}
