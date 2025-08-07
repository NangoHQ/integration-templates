import type { StandardEmployee } from '../../models.js';
import type { OracleHcmEmployeeResponse } from '../types.js';

/**
 * Maps an Oracle HCM employee to the standardized employee model
 * Uses expanded fields: names, addresses, emails, phones (if present)
 * @throws Error if required fields are missing
 */
export function toStandardEmployee(employee: OracleHcmEmployeeResponse): StandardEmployee {
    // Validate required fields
    if (!employee) {
        throw new Error('Employee data is required');
    }

    // Prefer names array for first/last name
    let firstName = employee.FirstName;
    let lastName = employee.LastName;
    const namesArray = employee['names']?.items || [];
    if (Array.isArray(namesArray) && namesArray.length > 0) {
        // Prefer LEG (legal) or PrimaryFlag
        const legal = namesArray.find((n: any) => n.NameType === 'LEG');
        const primary = namesArray.find((n: any) => n.PrimaryFlag === true);
        const nameObj = legal || primary || namesArray[0];
        if (nameObj) {
            firstName = nameObj.FirstName || firstName;
            lastName = nameObj.LastName || lastName;
        }
    }

    // Fallback to top-level name fields
    firstName = firstName || employee.FirstName || '';
    lastName = lastName || employee.LastName || '';

    // Prefer emails array for email
    let email = '';
    let emails: { type: 'WORK' | 'PERSONAL'; address: string }[] | undefined = undefined;
    const emailsArray = employee['emails']?.items || [];

    if (Array.isArray(emailsArray) && emailsArray.length > 0) {
        const work = emailsArray.find((e: any) => e.EmailType === 'W1' || e.EmailType === 'WORK');
        const primary = emailsArray.find((e: any) => e.PrimaryFlag === true);
        const emailObj = work || primary || emailsArray[0];
        if (emailObj?.EmailAddress) {
            email = emailObj.EmailAddress;
        }
        emails = emailsArray
            .filter((e: any) => e.EmailAddress)
            .map((e: any) => ({
                type: e.EmailType === 'W1' || e.EmailType === 'WORK' ? 'WORK' : 'PERSONAL',
                address: e.EmailAddress
            }));
    }

    // Fallback to top-level email field
    email = email || employee.WorkEmail || '';

    // Map and validate addresses
    let addresses: { street?: string; city?: string; state?: string; country?: string; postalCode?: string; type: 'WORK' | 'HOME' }[] | undefined = undefined;
    let primaryWorkAddress;
    const addressesArray = employee['addresses']?.items || [];
    if (Array.isArray(addressesArray) && addressesArray.length > 0) {
        addresses = addressesArray
            .filter((a: any) => a.AddressLine1 || a.TownOrCity || a.Country) // Only include addresses with some data
            .map((a: any) => ({
                street: a.AddressLine1 || '',
                city: a.TownOrCity || '',
                state: a.Region2 || a.Region1 || '',
                country: a.Country || '',
                postalCode: a.PostalCode || '',
                type: a.AddressType === 'WORK' ? 'WORK' : 'HOME'
            }));

        // Find primary work address for workLocation
        primaryWorkAddress =
            addressesArray.find((a: any) => a.AddressType === 'WORK' && a.PrimaryFlag === true) || addressesArray.find((a: any) => a.AddressType === 'WORK');
    }

    // Map phones with validation
    let phones: { type: 'WORK' | 'HOME' | 'MOBILE'; number: string }[] | undefined = undefined;
    const phonesArray = employee['phones']?.items || [];
    if (Array.isArray(phonesArray) && phonesArray.length > 0) {
        phones = phonesArray
            .filter((p: any) => p.PhoneNumber)
            .map((p: any) => ({
                type: p.PhoneType === 'MOBILE' ? 'MOBILE' : p.PhoneType === 'HOME' ? 'HOME' : 'WORK',
                number: p.PhoneNumber
            }));
    }

    // Use first assignment if available
    const assignmentsArray = employee['assignments']?.items || [];
    const assignment = Array.isArray(assignmentsArray) && assignmentsArray.length > 0 ? assignmentsArray[0] : undefined;

    // Map employmentType with logging
    function mapEmploymentType(type: string | undefined): StandardEmployee['employmentType'] {
        const upperType = (type || '').toUpperCase();
        switch (upperType) {
            case 'PART_TIME':
                return 'PART_TIME';
            case 'CONTRACTOR':
                return 'CONTRACTOR';
            case 'INTERN':
                return 'INTERN';
            case 'TEMPORARY':
                return 'TEMPORARY';
            case 'OTHER':
                return 'OTHER';
            default:
                return 'FULL_TIME';
        }
    }

    // Map employmentStatus with logging
    function mapEmploymentStatus(status: string | undefined): StandardEmployee['employmentStatus'] {
        const upperStatus = (status || '').toUpperCase();
        switch (upperStatus) {
            case 'TERMINATED':
                return 'TERMINATED';
            case 'ON_LEAVE':
                return 'ON_LEAVE';
            case 'SUSPENDED':
                return 'SUSPENDED';
            case 'PENDING':
                return 'PENDING';
            default:
                return 'ACTIVE';
        }
    }

    // Prefer department from assignment
    const departmentId = assignment?.DepartmentId || employee.DepartmentId || '';
    const departmentName = assignment?.DepartmentName || employee.DepartmentName || '';

    // Build manager object only with available data
    const managerData: StandardEmployee['manager'] | undefined =
        assignment?.ManagerId || employee.ManagerId
            ? {
                  id: (assignment?.ManagerId || employee.ManagerId).toString(),
                  ...(assignment?.ManagerFirstName ? { firstName: assignment.ManagerFirstName } : {}),
                  ...(assignment?.ManagerLastName ? { lastName: assignment.ManagerLastName } : {}),
                  ...(assignment?.ManagerEmail ? { email: assignment.ManagerEmail } : {})
              }
            : undefined;

    // Determine work location type based on available data
    const workLocationType: StandardEmployee['workLocation']['type'] =
        employee['WorkArrangement'] === 'REMOTE' ? 'REMOTE' : employee['WorkArrangement'] === 'HYBRID' ? 'HYBRID' : 'OFFICE';

    // Parse dates safely
    const parseDate = (date: string | undefined): string => {
        if (!date) return '';
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-try-catch-unless-explicitly-allowed
        try {
            return new Date(date).toISOString();
        } catch {
            return '';
        }
    };

    return {
        id: employee.PersonId.toString(),
        firstName,
        lastName,
        email,
        displayName: employee.DisplayName || `${firstName} ${lastName}`.trim(),
        ...(employee.PersonNumber ? { employeeNumber: employee.PersonNumber } : {}),
        ...(employee.Title ? { title: employee.Title } : {}),
        department: {
            id: departmentId,
            name: departmentName
        },
        employmentType: mapEmploymentType(assignment?.AssignmentType),
        employmentStatus: mapEmploymentStatus(assignment?.AssignmentStatusType),
        startDate: parseDate(employee.StartDate) || parseDate(employee['CreationDate']) || '',
        ...(employee.TerminationDate ? { terminationDate: parseDate(employee.TerminationDate) } : {}),
        ...(managerData ? { manager: managerData } : {}),
        workLocation: {
            name: primaryWorkAddress?.AddressLine1 || '',
            type: workLocationType,
            ...(primaryWorkAddress
                ? {
                      primaryAddress: {
                          street: primaryWorkAddress.AddressLine1 || '',
                          city: primaryWorkAddress.TownOrCity || '',
                          state: primaryWorkAddress.Region2 || '',
                          country: primaryWorkAddress.Country || '',
                          postalCode: primaryWorkAddress.PostalCode || '',
                          type: 'WORK'
                      }
                  }
                : {})
        },
        ...(addresses?.length ? { addresses } : {}),
        ...(phones?.length ? { phones } : {}),
        ...(emails?.length ? { emails } : {}),
        providerSpecific: {
            ...(employee.CorrespondenceLanguage && { correspondenceLanguage: employee.CorrespondenceLanguage }),
            ...(employee.BloodType && { bloodType: employee.BloodType }),
            ...(employee.DateOfBirth && { dateOfBirth: parseDate(employee.DateOfBirth) }),
            ...(employee.DateOfDeath && { dateOfDeath: parseDate(employee.DateOfDeath) }),
            ...(employee.CountryOfBirth && { countryOfBirth: employee.CountryOfBirth }),
            ...(employee.RegionOfBirth && { regionOfBirth: employee.RegionOfBirth }),
            ...(employee.TownOfBirth && { townOfBirth: employee.TownOfBirth }),
            ...(employee.ApplicantNumber && { applicantNumber: employee.ApplicantNumber }),
            ...(employee.CreatedBy && { createdBy: employee.CreatedBy }),
            ...(employee.LastUpdatedBy && { lastUpdatedBy: employee.LastUpdatedBy })
        },
        createdAt: parseDate(employee['CreationDate']) || '',
        updatedAt: parseDate(employee['LastUpdateDate']) || ''
    };
}
