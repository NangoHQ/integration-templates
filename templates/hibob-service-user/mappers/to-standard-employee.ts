import type { HibobEmployeeResponse } from '../types.js';
import type { StandardEmployee, Address } from ../models.js;

/**
 * Maps HiBob employment type to standardized employment type
 */
function mapEmploymentType(hibobType?: string): StandardEmployee['employmentType'] {
    if (!hibobType) return 'OTHER';

    const typeMap: Record<string, StandardEmployee['employmentType']> = {
        'full-time': 'FULL_TIME',
        'part-time': 'PART_TIME',
        contractor: 'CONTRACTOR',
        intern: 'INTERN',
        temporary: 'TEMPORARY'
    };

    return typeMap[hibobType.toLowerCase()] || 'OTHER';
}

/**
 * Maps HiBob employment status to standardized status
 */
function mapEmploymentStatus(hibobStatus?: string): StandardEmployee['employmentStatus'] {
    if (!hibobStatus) return 'ACTIVE';

    const statusMap: Record<string, StandardEmployee['employmentStatus']> = {
        active: 'ACTIVE',
        terminated: 'TERMINATED',
        leave: 'ON_LEAVE',
        suspended: 'SUSPENDED',
        pending: 'PENDING'
    };

    return statusMap[hibobStatus.toLowerCase()] || 'ACTIVE';
}

/**
 * Maps HiBob site type to standardized location type
 */
function mapLocationType(siteType?: string): StandardEmployee['workLocation']['type'] {
    if (!siteType) return 'OFFICE';

    const typeMap: Record<string, StandardEmployee['workLocation']['type']> = {
        remote: 'REMOTE',
        office: 'OFFICE',
        hybrid: 'HYBRID'
    };

    return typeMap[siteType.toLowerCase()] || 'OFFICE';
}

/**
 * Maps HiBob address to standardized address format
 */
function mapAddress(hibobAddress: any, type: Address['type']): Address {
    return {
        street: hibobAddress.street || '',
        city: hibobAddress.city || '',
        state: hibobAddress.state || '',
        country: hibobAddress.country || '',
        postalCode: hibobAddress.postalCode || '',
        type
    };
}

/**
 * Maps HiBob employee data to standardized employee format
 */
export function toStandardEmployee(employee: HibobEmployeeResponse): StandardEmployee {
    const addresses: Address[] = [];
    const phones: { type: 'WORK' | 'HOME' | 'MOBILE'; number: string }[] = [];
    const emails: { type: 'WORK' | 'PERSONAL'; address: string }[] = [];

    // Add work address if available
    if (employee.work?.address) {
        addresses.push(mapAddress(employee.work.address, 'WORK'));
    }

    // Add personal addresses if available
    if (employee.personal?.addresses) {
        employee.personal.addresses.forEach((addr) => {
            addresses.push(mapAddress(addr, 'HOME'));
        });
    }

    // Add phone numbers
    if (employee.personal?.workPhone) {
        phones.push({ type: 'WORK', number: employee.personal.workPhone });
    }
    if (employee.personal?.homePhone) {
        phones.push({ type: 'HOME', number: employee.personal.homePhone });
    }
    if (employee.personal?.mobilePhone) {
        phones.push({ type: 'MOBILE', number: employee.personal.mobilePhone });
    }

    // Add emails
    emails.push({ type: 'WORK', address: employee.email });
    if (employee.personal?.email) {
        emails.push({ type: 'PERSONAL', address: employee.personal.email });
    }

    return {
        // Core fields
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.surname,
        email: employee.email,
        displayName: employee.displayName,

        // Employment details
        title: employee.work?.title || '',
        department: {
            id: employee.work?.department?.id || '',
            name: employee.work?.department?.name || ''
        },
        employmentType: mapEmploymentType(employee.work?.employmentType),
        employmentStatus: mapEmploymentStatus(employee.work?.status),
        startDate: employee.work?.startDate || '',
        ...(employee.work?.terminationDate ? { terminationDate: employee.work.terminationDate } : {}),
        ...(employee.work?.reportsTo
            ? {
                  manager: {
                      id: employee.work.reportsTo.id,
                      firstName: employee.work.reportsTo.firstName,
                      lastName: employee.work.reportsTo.surname,
                      email: employee.work.reportsTo.email
                  }
              }
            : {}),
        workLocation: {
            name: employee.work?.site || '',
            type: mapLocationType(employee.work?.siteType),
            ...(employee.work?.address
                ? {
                      primaryAddress: {
                          street: employee.work.address.street || '',
                          city: employee.work.address.city || '',
                          state: employee.work.address.state || '',
                          country: employee.work.address.country || '',
                          postalCode: employee.work.address.postalCode || '',
                          type: 'WORK'
                      }
                  }
                : {})
        },

        // Personal details
        addresses:
            addresses.length > 0
                ? addresses
                : [
                      {
                          street: '',
                          city: '',
                          state: '',
                          country: '',
                          postalCode: '',
                          type: 'WORK'
                      }
                  ],
        phones:
            phones.length > 0
                ? phones
                : [
                      {
                          type: 'WORK',
                          number: ''
                      }
                  ],
        emails:
            emails.length > 0
                ? emails
                : [
                      {
                          type: 'WORK',
                          address: employee.email
                      }
                  ],

        // Provider-specific data
        providerSpecific: {
            customFields: employee.work?.customFields || {},
            about: employee.about || {}
        },

        // Audit fields
        createdAt: employee.about?.createdAt || '',
        updatedAt: employee.about?.updatedAt || ''
    } satisfies StandardEmployee;
}
