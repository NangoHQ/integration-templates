import type { StandardEmployee } from '../../models.js';
import type { OracleHcmEmployeeResponse } from '../types';

/**
 * Maps an Oracle HCM employee to the standardized employee model
 * Uses expanded fields: names, addresses, emails, phones (if present)
 */
export function toStandardEmployee(employee: OracleHcmEmployeeResponse): StandardEmployee {
    // Prefer names array for first/last name
    let firstName = employee.FirstName;
    let lastName = employee.LastName;
    if (Array.isArray(employee['names']) && employee['names'].length > 0) {
        // Prefer LEG (legal) or PrimaryFlag
        const legal = employee['names'].find((n: any) => n.NameType === 'LEG');
        const primary = employee['names'].find((n: any) => n.PrimaryFlag === true);
        const nameObj = legal || primary || employee['names'][0];
        if (nameObj) {
            firstName = nameObj.FirstName || firstName;
            lastName = nameObj.LastName || lastName;
        }
    }

    // Prefer emails array for email
    let email = employee.WorkEmail;
    let emails: { type: 'WORK' | 'PERSONAL'; address: string }[] | undefined = undefined;
    if (Array.isArray(employee['emails']) && employee['emails'].length > 0) {
        const work = employee['emails'].find((e: any) => e.Type === 'WORK');
        const primary = employee['emails'].find((e: any) => e.PrimaryFlag === true);
        const emailObj = work || primary || employee['emails'][0];
        if (emailObj) {
            email = emailObj.Address || email;
        }
        emails = employee['emails'].map((e: any) => ({
            type: e.Type === 'WORK' || e.Type === 'PERSONAL' ? e.Type : 'WORK',
            address: e.Address || ''
        }));
    }

    // Prefer addresses array
    let addresses: { street?: string; city?: string; state?: string; country?: string; postalCode?: string; type: 'WORK' | 'HOME' }[] | undefined = undefined;
    if (Array.isArray(employee['addresses']) && employee['addresses'].length > 0) {
        addresses = employee['addresses'].map((a: any) => ({
            street: a.Street || '',
            city: a.City || '',
            state: a.State || '',
            country: a.Country || '',
            postalCode: a.PostalCode || '',
            type: a.Type === 'WORK' || a.Type === 'HOME' ? a.Type : 'HOME'
        }));
    }

    // Prefer phones array
    let phones: { type: 'WORK' | 'HOME' | 'MOBILE'; number: string }[] | undefined = undefined;
    if (Array.isArray(employee['phones']) && employee['phones'].length > 0) {
        phones = employee['phones'].map((p: any) => ({
            type: p.Type === 'WORK' || p.Type === 'HOME' || p.Type === 'MOBILE' ? p.Type : 'WORK',
            number: p.Number || ''
        }));
    }

    // Use first assignment if available
    const assignment = Array.isArray(employee['assignments']) && employee['assignments'].length > 0 ? employee['assignments'][0] : undefined;

    // Map employmentType and employmentStatus from assignment or fallback
    function mapEmploymentType(type: string | undefined): StandardEmployee['employmentType'] {
        switch ((type || '').toUpperCase()) {
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
    function mapEmploymentStatus(status: string | undefined): StandardEmployee['employmentStatus'] {
        switch ((status || '').toUpperCase()) {
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

    // Prefer manager from assignment
    const managerId = assignment?.ManagerId || employee.ManagerId;

    return {
        id: employee.PersonId,
        firstName,
        lastName,
        email,
        displayName: employee.DisplayName,
        ...(employee.PersonNumber ? { employeeNumber: employee.PersonNumber } : {}),
        ...(employee.Title ? { title: employee.Title } : {}),
        department: {
            id: departmentId,
            name: departmentName
        },
        employmentType: mapEmploymentType(assignment?.AssignmentType),
        employmentStatus: mapEmploymentStatus(assignment?.AssignmentStatusType),
        startDate: employee.StartDate || '',
        ...(employee.TerminationDate ? { terminationDate: employee.TerminationDate } : {}),
        ...(managerId
            ? {
                  manager: {
                      id: managerId,
                      firstName: '',
                      lastName: '',
                      email: ''
                  }
              }
            : {}),
        workLocation: {
            name: '',
            type: 'OFFICE'
        },
        ...(addresses ? { addresses } : {}),
        ...(phones ? { phones } : {}),
        ...(emails ? { emails } : {}),
        providerSpecific: { ...employee },
        createdAt: employee.StartDate || '',
        updatedAt: new Date().toISOString()
    };
}
