import type { StandardEmployee, Email, Phone, Address } from '../../models.js';
import type { SapSuccessFactorsPerPerson, SapSuccessFactorsEmail } from '../types.js';

function getPrimaryEmail(emails: SapSuccessFactorsEmail[]): string {
    if (!emails || emails.length === 0) {
        return '';
    }

    const businessEmail = emails.find((e) => e.emailType === 'B');
    return businessEmail ? businessEmail.emailAddress : (emails[0]?.emailAddress ?? '');
}

export function toStandardEmployee(person: SapSuccessFactorsPerPerson): StandardEmployee {
    const emails: Email[] =
        person.emailNav?.results.map((e) => ({
            address: e.emailAddress,
            type: e.emailType === 'B' ? 'WORK' : 'PERSONAL'
        })) ?? [];

    const phones: Phone[] =
        person.phoneNav?.results.map((p) => ({
            number: p.phoneNumber,
            type: p.phoneType === 'B' ? 'WORK' : 'MOBILE'
        })) ?? [];

    const addresses: Address[] =
        person.homeAddressNavDEFLT?.results.map((a) => ({
            street: a.address1 ?? '',
            city: a.city ?? '',
            state: a.state ?? '',
            country: a.country ?? '',
            postalCode: a.zipCode ?? '',
            type: 'HOME'
        })) ?? [];

    return {
        id: person.perPersonUuid,
        firstName: person.personalInfoNav?.firstName ?? '',
        lastName: person.personalInfoNav?.lastName ?? '',
        email: getPrimaryEmail(person.emailNav?.results),
        displayName: `${person.personalInfoNav?.firstName ?? ''} ${person.personalInfoNav?.lastName ?? ''}`.trim(),
        employeeNumber: person.personIdExternal,
        employmentStatus: 'ACTIVE', // Default value
        startDate: person.createdDateTime, // Assumption
        createdAt: person.createdDateTime,
        updatedAt: person.lastModifiedDateTime,
        emails: emails,
        phones: phones,
        addresses: addresses,
        providerSpecific: person,

        // TODO: Add more fields
        department: {
            id: '',
            name: ''
        },
        employmentType: 'FULL_TIME',
        workLocation: {
            name: '',
            type: 'OFFICE'
        }
    };
}
