import type { Address, StandardEmployee } from "../models.js";
import type {
  NamelyProfile,
  NamelyAddress,
  EmployeeType,
  LinkedGroup,
} from "../types.js";
import { parseDate } from "../helpers/utils.js";

/**
 * Maps a Namely address object to a StandardAddress
 */
function mapAddress(address: NamelyAddress, type: "WORK" | "HOME"): Address {
  return {
    street: address?.address1 ?? "",
    city: address?.city ?? "",
    state: address?.state_id ?? "",
    postalCode: address?.zip ?? "",
    country: address?.country_id ?? "",
    type,
  };
}

/**
 * Maps employment status from Namely to Standard format
 */
function mapEmploymentStatus(
  status: "active" | "pending" | "inactive",
): StandardEmployee["employmentStatus"] {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "pending":
      return "PENDING";
    case "inactive":
      return "TERMINATED";
    default:
      return "ACTIVE";
  }
}
/**
 * Maps employment type from Namely to Standard format
 */
function mapEmploymentType(
  type: EmployeeType,
): StandardEmployee["employmentType"] {
  switch (type.title) {
    case "Full Time":
      return "FULL_TIME";
    case "Part Time":
      return "PART_TIME";
    case "Intern":
      return "INTERN";
    case "Contractor":
      return "CONTRACTOR";
    case "Freelance":
      return "TEMPORARY";
    default:
      return "OTHER";
  }
}

/**
 * Maps a Namely profile to a StandardEmployee
 */
export function toStandardEmployee(
  profile: NamelyProfile,
  group: LinkedGroup[],
): StandardEmployee {
  // Find department from non-team groups
  const departmentLink = profile.links?.groups?.find((g) =>
    group.find(
      (fullGroup) => fullGroup.id === g.id && fullGroup.type === "department",
    ),
  );

  const department = departmentLink
    ? group.find(
        (fullGroup) =>
          fullGroup.id === departmentLink.id && fullGroup.type === "department",
      )
    : null;

  // Map the office address
  const officeAddress = mapAddress(profile.office, "WORK");

  const employee: StandardEmployee = {
    id: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    displayName:
      profile.full_name || `${profile.first_name} ${profile.last_name}`,
    email: profile.email,
    // blank if never provided
    ...(profile.employee_id.trim() && {
      employeeNumber: profile.employee_id.trim(),
    }),
    title: profile.job_title.title,
    department: department
      ? {
          id: department.id,
          name: department.title,
        }
      : { id: "", name: "" },
    employmentType: mapEmploymentType(profile.employee_type),
    employmentStatus: mapEmploymentStatus(profile.user_status),
    startDate: parseDate(profile.start_date),
    // blank if never provided
    terminationDate: profile.departure_date
      ? parseDate(profile.departure_date)
      : null,
    terminationType: profile.terminated_reason ?? null,
    ...(profile.reports_to?.[0] && {
      manager: {
        id: profile.reports_to[0].id,
        firstName: profile.reports_to[0].first_name,
        lastName: profile.reports_to[0].last_name,
        email: profile.reports_to[0].email,
      },
    }),
    workLocation: {
      name: officeAddress?.city?.trim()
        ? `${officeAddress.city} Office`
        : "Main Office",
      type: "OFFICE",
      primaryAddress: officeAddress,
    },
    addresses: [
      mapAddress(profile.home, "HOME"),
      mapAddress(profile.office, "WORK"),
    ],
    phones: [
      ...(profile.office_phone
        ? [{ number: profile.office_phone, type: "WORK" as const }]
        : []),
      ...(profile.mobile_phone
        ? [{ number: profile.mobile_phone, type: "MOBILE" as const }]
        : []),
      ...(profile.home_phone
        ? [{ number: profile.home_phone, type: "HOME" as const }]
        : []),
    ],
    emails: [
      ...(profile.email
        ? [{ address: profile.email, type: "WORK" as const }]
        : []),
      ...(profile.personal_email
        ? [{ address: profile.personal_email, type: "PERSONAL" as const }]
        : []),
    ],
    createdAt: new Date(profile.created_at * 1000).toISOString(),
    updatedAt: new Date(profile.updated_at * 1000).toISOString(),
    providerSpecific: {
      preferredName: profile.preferred_name,
      middleName: profile.middle_name,
      bio: profile.bio,
      gender: profile.gender,
      maritalStatus: profile.marital_status,
      linkedInUrl: profile.linkedin_url,
      salary: profile.salary,
      healthCare: profile.healthcare,
      dental: profile.dental,
      teams: profile.links.teams,
      assetManagement: profile.asset_management,
      emergencyContact: profile.emergency_contact
        ? {
            name: profile.emergency_contact,
            phone: profile.emergency_contact_phone,
          }
        : undefined,
    },
  };

  return employee;
}
