import { createAction } from 'nango';
import type { UnanetContact } from '../types.js';

import { toContact } from '../mappers/to-contact.js';
import { getOrCreateCompany } from '../helpers/get-or-create-company.js';

import { Contact } from '../models.js';

type contacts = keyof Contact;
const required: contacts[] = ['firstName', 'lastName', 'position', 'emailAddress', 'phone', 'fax'];

const action = createAction({
    description: 'Create a contact in the system',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/contacts',
        group: 'Contacts'
    },

    input: Contact,
    output: Contact,

    exec: async (nango, input): Promise<Contact> => {
        validate(nango, input);

        const company = await getOrCreateCompany(nango, input.federalAgency);

        // Phone doesn't exist on a UnanetContact
        // so nest it under Addresses
        const unanetContact: UnanetContact = {
            FirstName: input.firstName,
            LastName: input.lastName,
            CompanyId: Number(company.id),
            CompanyName: input.federalAgency.name,
            Title: input.position,
            Email: input.emailAddress,
            Addresses: [
                {
                    AddressTypeName: `${input.federalAgency.name} Address`,
                    Address1: input.federalAgency.address1 || '',
                    Address2: input.federalAgency.address2 || '',
                    OfficePhone: input.phone,
                    City: input.federalAgency.city || '',
                    PostalCode: input.federalAgency.zip || '',
                    OfficeFax: input.fax,
                    CountryName: input.federalAgency.country || ''
                }
            ]
        };

        const response = await nango.post({
            endpoint: '/api/contacts',
            data: [unanetContact],
            retries: 3
        });

        return toContact(response.data[0], input);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;

function validate(nango: NangoActionLocal, input: Contact) {
    required.forEach((field) => {
        if (!input[field]) {
            throw new nango.ActionError({
                message: `${field} is required to create a contact`,
                code: `missing_${field}`
            });
        }
    });

    if (!input.federalAgency) {
        throw new nango.ActionError({
            message: 'federalAgency is required to create a contact',
            code: 'missing_federalAgency'
        });
    }

    if (!input.federalAgency.name) {
        throw new nango.ActionError({
            message: 'federalAgency.name is required to create a contact',
            code: 'missing_federalAgency_name'
        });
    }
}
