import type { StandardEmployee } from "../models.js";
import type { SingleEmployeeResponse } from "../types.js";

/**
 * Maps a UKG Ready SingleEmployeeResponse API response to the StandardEmployee model.
 */
export function toEmployee(employee: SingleEmployeeResponse): StandardEmployee {
  return {
    id: employee.id.toString(),
    firstName: employee.first_name,
    lastName: employee.last_name,
    email: employee.primary_email || "",
    displayName: `${employee.first_name} ${employee.last_name}`.trim(),
    employeeNumber: employee.employee_id,
    title: "",
    department: { id: "", name: "" },
    employmentType: "OTHER",
    employmentStatus: mapEmploymentStatus(employee.status),
    startDate: employee.dates?.hired || "",

    workLocation: { name: "", type: "OFFICE" },
    terminationDate: null,
    terminationType: null,
    addresses: employee.address
      ? [
          {
            type: "HOME",
            street: employee.address.address_line_1 || "",
            city: employee.address.city || "",
            state: employee.address.state || "",
            postalCode: employee.address.zip || "",
            country: employee.address.country || "",
          },
        ]
      : [],
    phones: [
      ...(employee.phones?.cell_phone
        ? [
            {
              // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
              type: "MOBILE" as const,
              number: employee.phones.cell_phone,
            },
          ]
        : []),
      ...(employee.phones?.home_phone
        ? [
            {
              // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
              type: "HOME" as const,
              number: employee.phones.home_phone,
            },
          ]
        : []),
      ...(employee.phones?.work_phone
        ? [
            {
              // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
              type: "WORK" as const,
              number: employee.phones.work_phone,
            },
          ]
        : []),
    ],
    emails: employee.primary_email
      ? [
          {
            type: "WORK",
            address: employee.primary_email,
          },
        ]
      : [],
    providerSpecific: {
      username: employee.username,
      links: employee._links,
      startedDate: employee.dates?.started,
      middleName: employee.middle_name,
      nickname: employee.nickname,
      suffix: employee.suffix,
      photoHref: employee.photo_href,
      isPhotoUploaded: employee.isPhotoUploaded,
      locked: employee.locked,
      forceChangePassword: employee.force_change_password,
      timezone: employee.timezone,
      useSeparateMailingAddress: employee.use_separate_mailing_address,
      birthday: employee.dates?.birthday,
      managers: employee.managers,
      costCentersInfo: employee.cost_centers_info,
      addToNewHireExport: employee.add_to_new_hire_export,
      hardwareSettings: employee.hardware_settings,
      managedCostCentersEnabled: employee.managed_cost_centers_enabled,
    },
    createdAt: employee.dates?.hired || "",
    updatedAt: employee.dates?.hired || "",
  };
}

function mapEmploymentStatus(
  status: string,
): StandardEmployee["employmentStatus"] {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "ACTIVE";
    case "TERMINATED":
      return "TERMINATED";
    case "ON_LEAVE":
      return "ON_LEAVE";
    case "SUSPENDED":
      return "SUSPENDED";
    case "PENDING":
      return "PENDING";
    default:
      return "ACTIVE";
  }
}
