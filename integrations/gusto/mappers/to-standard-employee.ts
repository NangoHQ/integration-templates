import type { StandardEmployee } from '../../models.js';
import type { EmployeeResponse } from '../types.js';

function mapEmploymentType(employee: EmployeeResponse): 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'INTERN' | 'TEMPORARY' | 'OTHER' {
    if (!employee.jobs || employee.jobs.length === 0) return 'OTHER';

    const primaryJob = employee.jobs.find((job) => job.primary);
    if (!primaryJob) return 'OTHER';

    // Gusto doesn't provide direct employment type, inferring from job details
    if (primaryJob.payment_unit === 'Hour') {
        return 'PART_TIME';
    } else if (primaryJob.payment_unit === 'Year') {
        return 'FULL_TIME';
    }

    return 'OTHER';
}

function mapEmploymentStatus(employee: EmployeeResponse): 'ACTIVE' | 'TERMINATED' | 'ON_LEAVE' | 'SUSPENDED' | 'PENDING' {
    if (employee.terminated) {
        return 'TERMINATED';
    }
    if (employee.onboarded) {
        return 'ACTIVE';
    }
    return 'PENDING';
}

export function toStandardEmployee(employee: EmployeeResponse): StandardEmployee {
    const primaryJob = employee.jobs?.find((job) => job.primary);
    const displayName = employee.preferred_first_name || employee.first_name;

    return {
        // Core fields
        id: employee.uuid,
        firstName: employee.first_name,
        lastName: employee.last_name,
        email: employee.email,
        displayName: `${displayName} ${employee.last_name}`,

        // Employment details
        title: primaryJob?.title || '',
        department: {
            id: employee.department_uuid,
            name: employee.department
        },
        employmentType: mapEmploymentType(employee),
        employmentStatus: mapEmploymentStatus(employee),
        startDate: primaryJob?.hire_date || new Date().toISOString(),
        terminationDate: employee.terminated ? new Date().toISOString() : undefined,
        manager: employee.manager_uuid
            ? {
                  id: employee.manager_uuid,
                  firstName: '', // Gusto doesn't provide manager details
                  lastName: '', // We'd need another API call to get these
                  email: '' // Consider implementing this in the future
              }
            : {
                  id: '', // Empty manager object when no manager exists
                  firstName: '',
                  lastName: '',
                  email: ''
              },
        workLocation: {
            name: 'Unknown', // Gusto doesn't provide location details
            type: 'HYBRID', // Default since Gusto doesn't specify
            primaryAddress: {
                street: undefined,
                city: undefined,
                state: undefined,
                country: undefined,
                postalCode: undefined,
                type: 'WORK'
            }
        },

        // Personal details
        addresses: [], // Gusto doesn't provide address details
        phones: employee.phone
            ? [
                  {
                      type: 'WORK' as const,
                      number: employee.phone
                  }
              ]
            : [],
        emails: [
            {
                type: 'WORK' as const,
                address: employee.work_email || employee.email
            },
            {
                type: 'PERSONAL' as const,
                address: employee.email
            }
        ].filter(
            (email, index, self) =>
                // Remove duplicates and empty emails
                email.address && self.findIndex((e) => e.address === email.address) === index
        ),

        // Provider-specific data
        metadata: {
            uuid: employee.uuid,
            companyUuid: employee.company_uuid,
            version: employee.version,
            onboardingStatus: employee.onboarding_status,
            dateOfBirth: employee.date_of_birth,
            hasSsn: employee.has_ssn,
            customFields: Array.isArray(employee.custom_fields) ? employee.custom_fields : []
        },

        // Audit fields
        createdAt: new Date().toISOString(), // Gusto doesn't provide creation date
        updatedAt: new Date().toISOString() // Gusto doesn't provide update date
    };
}
