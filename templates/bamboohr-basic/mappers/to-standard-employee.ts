import type { StandardEmployee, Phone } from ../models.js;
import type { BambooHrEmployee } from '../types.js';

function mapEmploymentType(status: string | undefined): StandardEmployee['employmentType'] {
    if (!status) return 'OTHER';

    switch (status.toUpperCase()) {
        case 'FULL-TIME':
            return 'FULL_TIME';
        case 'PART-TIME':
            return 'PART_TIME';
        case 'INTERN':
            return 'INTERN';
        case 'CONTRACTOR':
            return 'CONTRACTOR';
        default:
            return 'OTHER';
    }
}

function mapEmploymentStatus(status: string | undefined): StandardEmployee['employmentStatus'] {
    if (!status) return 'PENDING';

    switch (status.toUpperCase()) {
        case 'TERMINATED':
            return 'TERMINATED';
        case 'FULL-TIME':
        case 'PART-TIME':
        case 'INTERN':
            return 'ACTIVE';
        default:
            return 'PENDING';
    }
}

export function toStandardEmployee(employee: BambooHrEmployee): StandardEmployee {
    const supervisorParts = (employee['supervisor'] || '').split(',');
    const supervisorFirstName = supervisorParts[1]?.trim() || '';
    const supervisorLastName = supervisorParts[0]?.trim() || '';

    const manager = employee['supervisorId']
        ? {
              id: employee['supervisorId'],
              firstName: supervisorFirstName,
              lastName: supervisorLastName,
              email: '' // BambooHR API doesn't provide supervisor's email
          }
        : {
              id: '',
              firstName: '',
              lastName: '',
              email: ''
          };

    const baseEmployee: StandardEmployee = {
        // Core fields
        id: employee['id'] || '',
        firstName: employee['firstName'] || '',
        lastName: employee['lastName'] || '',
        email: employee['bestEmail'] || '',
        displayName: `${employee['firstName'] || ''} ${employee['lastName'] || ''}`.trim(),
        employeeNumber: employee['employeeNumber'] || '',

        // Employment details
        title: employee['jobTitle'] || '',
        department: {
            id: employee['department'] || 'unknown',
            name: employee['department'] || 'Unknown Department'
        },
        employmentType: mapEmploymentType(employee['employmentHistoryStatus']),
        employmentStatus: mapEmploymentStatus(employee['employmentHistoryStatus']),
        startDate: employee['hireDate'] || new Date().toISOString(),
        terminationDate: employee['employmentHistoryStatus'] === 'Terminated' ? employee['hireDate'] : '',
        manager,
        workLocation: {
            name: employee['location'] || '',
            type: 'OFFICE',
            primaryAddress: {
                street: employee['address1'] || '',
                city: employee['city'] || '',
                state: employee['state'] || '',
                country: employee['country'] || '',
                postalCode: '',
                type: 'WORK'
            }
        },

        // Personal details
        addresses: [
            {
                street: employee['address1'] || '',
                city: employee['city'] || '',
                state: employee['state'] || '',
                country: employee['country'] || '',
                postalCode: '',
                type: 'HOME'
            }
        ],
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
        phones: [
            ...(employee['workPhone'] ? [{ type: 'WORK', number: employee['workPhone'] }] : []),
            ...(employee['homePhone'] ? [{ type: 'HOME', number: employee['homePhone'] }] : [])
        ] as Phone[],
        emails: [{ type: 'WORK', address: employee['bestEmail'] || '' }],

        // Provider-specific data
        providerSpecific: {
            division: employee['division'],
            exempt: employee['exempt'],
            payRate: employee['payRate'],
            payType: employee['payType'],
            payPer: employee['payPer'],
            createdByUserId: employee['createdByUserId']
        },

        // Audit fields
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    return baseEmployee;
}
