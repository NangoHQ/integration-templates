import type { StandardEmployee, Phone, Email } from "../../models.js";
import type { ADPEmployee } from "../types.js";
import { parseDate } from "../helpers/utils.js";

function mapEmploymentType(
  workerTypeCode:
    | { codeValue?: string; longName?: string; shortName?: string }
    | undefined,
): StandardEmployee["employmentType"] {
  if (!workerTypeCode?.codeValue) return "OTHER";

  const type = [
    workerTypeCode?.longName?.toLowerCase(),
    workerTypeCode?.shortName?.toLowerCase(),
    workerTypeCode?.codeValue?.toLowerCase(),
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/-|_/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

  if (type.includes("trainee") || type.includes("intern")) return "INTERN";
  if (
    type.includes("freelancer") ||
    type.includes("contractor") ||
    type.includes("consultant")
  )
    return "CONTRACTOR";
  if (type.includes("temporary")) return "TEMPORARY";
  if (type.includes("full time")) return "FULL_TIME";
  if (type.includes("part time")) return "PART_TIME";

  // Default to OTHER since we don't have clear full-time/part-time indicators
  return "OTHER";
}

function mapEmploymentStatus(
  statusCode: { codeValue?: string; shortName?: string } | undefined,
): StandardEmployee["employmentStatus"] {
  if (!statusCode?.codeValue) return "PENDING";

  const status =
    statusCode.shortName?.toLowerCase() || statusCode.codeValue.toLowerCase();

  if (status.includes("terminated")) return "TERMINATED";
  if (status === "active") return "ACTIVE";

  return "PENDING";
}

export function toStandardEmployee(employee: ADPEmployee): StandardEmployee {
  const workAssignment = employee.workAssignments?.[0];
  const legalName = employee.person?.legalName;
  const businessEmail = employee.businessCommunication?.emails?.[0];
  const personalEmail = employee.person?.communication?.emails?.[0];
  const workMobile = employee.businessCommunication?.mobiles?.[0];
  const workLandline = employee.businessCommunication?.landlines?.[0];
  const personalMobile = employee.person?.communication?.mobiles?.[0];
  const personalLandline = employee.person?.communication?.landlines?.[0];
  const legalAddress = employee.person?.legalAddress;

  // Extract job title and department information
  const jobTitle =
    workAssignment?.jobTitle || workAssignment?.jobCode?.shortName || "";
  const jobCode = workAssignment?.jobCode?.codeValue || "";
  const positionId = workAssignment?.positionID || "";

  // Try to extract department from occupational classifications
  const departmentName =
    workAssignment?.occupationalClassifications?.[0]?.classificationCode
      ?.shortName ||
    workAssignment?.occupationalClassifications?.[0]?.nameCode?.shortName ||
    "Unknown Department";

  // Extract termination information
  const terminationDate = parseDate(
    workAssignment?.terminationDate || employee.workerDates?.terminationDate,
  );
  const terminationReason =
    workAssignment?.assignmentStatus?.reasonCode?.shortName || "";

  // Use positionID as title if no job title is available, but prefer job title
  const displayTitle = jobTitle || positionId;

  const baseEmployee: StandardEmployee = {
    // Core fields
    id: employee.associateOID || "",
    firstName: legalName?.givenName || "",
    lastName: legalName?.familyName1 || "",
    email: businessEmail?.emailUri || personalEmail?.emailUri || "",
    displayName:
      legalName?.formattedName ||
      `${legalName?.givenName || ""} ${legalName?.familyName1 || ""}`.trim(),
    employeeNumber: employee.workerID?.idValue,

    // Employment details
    title: displayTitle,
    department: {
      id: jobCode || positionId || "unknown",
      name: departmentName,
    },
    employmentType: mapEmploymentType(workAssignment?.workerTypeCode),
    employmentStatus: mapEmploymentStatus(
      workAssignment?.assignmentStatus?.statusCode,
    ),
    startDate: parseDate(employee.workerDates?.originalHireDate),
    terminationDate: terminationDate,
    terminationType: terminationReason,
    workLocation: {
      name: jobCode || positionId || "",
      type: "OFFICE",
      primaryAddress: {
        street: "",
        city: "",
        state: "",
        country: "",
        postalCode: "",
        type: "WORK",
      },
    },

    // Personal details - extract from legalAddress
    addresses: [
      ...(legalAddress
        ? [
            {
              street: `${legalAddress.lineOne || ""} ${
                legalAddress.lineTwo || ""
              }`.trim(),
              city: legalAddress.cityName || "",
              state: legalAddress.countrySubdivisionLevel1?.shortName || "",
              country: legalAddress.countryCode || "",
              postalCode: legalAddress.postalCode || "",
              type: "HOME" as const,
            },
          ]
        : []),
    ],
    phones: [
      ...(workMobile?.formattedNumber
        ? [
            {
              type: "WORK" as const,
              number: workMobile.formattedNumber,
            },
          ]
        : []),
      ...(workLandline?.formattedNumber
        ? [
            {
              type: "WORK" as const,
              number: workLandline.formattedNumber,
            },
          ]
        : []),
      ...(personalMobile?.formattedNumber
        ? [
            {
              type: "MOBILE" as const,
              number: personalMobile.formattedNumber,
            },
          ]
        : []),
      ...(personalLandline?.formattedNumber
        ? [
            {
              type: "HOME" as const,
              number: personalLandline.formattedNumber,
            },
          ]
        : []),
    ] as Phone[],
    emails: [
      ...(businessEmail?.emailUri
        ? [{ type: "WORK" as const, address: businessEmail.emailUri }]
        : []),
      ...(personalEmail?.emailUri
        ? [{ type: "PERSONAL" as const, address: personalEmail.emailUri }]
        : []),
    ] as Email[],

    // Provider-specific data
    providerSpecific: {
      associateOID: employee.associateOID,
      genderCode: employee.person?.genderCode?.codeValue,
      birthDate: employee.person?.birthDate,
      terminationDate: employee.workerDates?.terminationDate,
      nickName: legalName?.nickName,
      photoUrl: employee.photos?.[0]?.links?.[0]?.href || "",
      jobCode: jobCode,
      positionId: positionId,
      terminationReason: terminationReason,
      payCycleCode: workAssignment?.payCycleCode?.shortName,
      payrollGroupCode: workAssignment?.payrollGroupCode,
      managementPositionIndicator: workAssignment?.managementPositionIndicator,
      voluntaryIndicator: workAssignment?.voluntaryIndicator,
      hireDate: workAssignment?.hireDate,
      actualStartDate: workAssignment?.actualStartDate,
      preferredGenderPronounCode:
        employee.person?.preferredGenderPronounCode?.shortName,
      preferredName: employee.person?.preferredName,
      birthName: employee.person?.birthName,
    },

    createdAt: parseDate(employee.workerDates?.originalHireDate),
    updatedAt:
      parseDate(
        workAssignment?.terminationDate ||
          employee.workerDates?.terminationDate,
      ) || "",
  };

  return baseEmployee;
}
