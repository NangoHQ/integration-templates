import type { Employee } from ../models.js;
import type { OracleHcmEmployeeResponse, OracleAddress, OraclePhone, OracleEmail } from '../types.js';

/**
 * Maps Oracle HCM API employee response to lowerCamelCase OracleHcmEmployee model.
 */
export function toEmployee(raw: OracleHcmEmployeeResponse): Employee {
    const mapAddress = (a: OracleAddress) => ({
        addressLine1: a.AddressLine1,
        addressLine2: a.AddressLine2,
        townOrCity: a.TownOrCity,
        region2: a.Region2,
        country: a.Country,
        postalCode: a.PostalCode,
        addressType: a.AddressType,
        primaryFlag: a.PrimaryFlag
    });
    const mapPhone = (p: OraclePhone) => ({
        phoneType: p.PhoneType,
        phoneNumber: p.PhoneNumber,
        primaryFlag: p.PrimaryFlag
    });
    const mapEmail = (e: OracleEmail) => ({
        emailType: e.EmailType,
        emailAddress: e.EmailAddress,
        primaryFlag: e.PrimaryFlag
    });
    return {
        id: raw.PersonId.toString(),
        personNumber: raw.PersonNumber,
        displayName: raw.DisplayName,
        firstName: raw.FirstName,
        lastName: raw.LastName,
        workEmail: raw.WorkEmail,
        title: raw.Title,
        departmentId: raw.DepartmentId,
        departmentName: raw.DepartmentName,
        assignmentStatusType: raw.AssignmentStatusType,
        startDate: raw.StartDate,
        terminationDate: raw.TerminationDate,
        managerId: raw.ManagerId,
        managerName: raw.ManagerName,
        workLocationName: raw.WorkLocationName,
        workLocationType: raw.WorkLocationType,
        correspondenceLanguage: raw.CorrespondenceLanguage,
        bloodType: raw.BloodType,
        dateOfBirth: raw.DateOfBirth,
        dateOfDeath: raw.DateOfDeath,
        countryOfBirth: raw.CountryOfBirth,
        regionOfBirth: raw.RegionOfBirth,
        townOfBirth: raw.TownOfBirth,
        applicantNumber: raw.ApplicantNumber,
        createdBy: raw.CreatedBy,
        lastUpdatedBy: raw.LastUpdatedBy,
        creationDate: raw.CreationDate,
        lastUpdateDate: raw.LastUpdateDate,
        workLocationAddress: raw.WorkLocationAddress ? mapAddress(raw.WorkLocationAddress) : undefined,
        addresses: raw.addresses?.items ? raw.addresses.items.map(mapAddress) : [],
        phones: raw.phones?.items ? raw.phones.items.map(mapPhone) : [],
        emails: raw.emails?.items ? raw.emails.items.map(mapEmail) : []
    };
}
