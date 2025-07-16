import type { StandardEmployee, Email } from ../models.js;
import type { EmployeeResponse, Termination } from '../types.js';

const PERSONAL_EMAIL: Email['type'] = 'PERSONAL';
const WORK_EMAIL: Email['type'] = 'WORK';

function mapEmploymentType(employee: EmployeeResponse): StandardEmployee['employmentType'] {
    if (employee.current_employment_status) {
        switch (employee.current_employment_status) {
            case 'full_time':
                return 'FULL_TIME';
            case 'part_time_under_twenty_hours':
            case 'part_time_twenty_plus_hours':
                return 'PART_TIME';
            case 'variable':
                return 'CONTRACTOR';
            case 'seasonal':
                return 'OTHER'; // Assuming seasonal is not a standard employment type
            default:
                return 'OTHER';
        }
    }
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

function mapEmploymentStatus(employee: EmployeeResponse): StandardEmployee['employmentStatus'] {
    if (employee.terminated) {
        return 'TERMINATED';
    }
    if (employee.onboarded) {
        return 'ACTIVE';
    }
    return 'PENDING';
}

function mapTerminationDate(terminations: Termination[]): string {
    if (terminations.length === 0) return '';

    const [termination] = terminations; // Assuming the first termination is the most relevant

    if (termination && termination.effective_date) {
        return new Date(termination.effective_date).toISOString();
    }

    return '';
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
        startDate: primaryJob?.hire_date || '',
        terminationDate: employee.terminated ? mapTerminationDate(employee.terminations) : '',
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
                street: '',
                city: '',
                state: '',
                country: '',
                postalCode: '',
                type: 'WORK'
            }
        },

        // Personal details
        addresses: [],
        phones: employee.phone
            ? [
                  {
                      type: 'WORK',
                      number: employee.phone
                  }
              ]
            : [],
        emails: [
            {
                type: WORK_EMAIL,
                address: employee.work_email || employee.email
            },
            {
                type: PERSONAL_EMAIL,
                address: employee.email
            }
        ].filter(
            (email, index, self) =>
                // Remove duplicates and empty emails
                email.address && self.findIndex((e) => e.address === email.address) === index
        ),

        // Provider-specific data
        providerSpecific: {
            uuid: employee.uuid,
            companyUuid: employee.company_uuid,
            version: employee.version,
            onboardingStatus: employee.onboarding_status,
            dateOfBirth: employee.date_of_birth,
            hasSsn: employee.has_ssn,
            customFields: Array.isArray(employee.custom_fields) ? employee.custom_fields : []
        },

        // Audit fields
        createdAt: primaryJob?.hire_date || '',
        updatedAt: '' // no update date provided by Gusto
    };
}
