import type { NangoAction, ProxyConfiguration, Contact, CreateContact } from '../../models.js';
import type { RingCentralContactRecord } from '../types.js';
import { createContactSchema } from '../schema.zod.js';

/**
 * Creates a new external contact in RingCentral.
 *
 * API Documentation: https://developers.ringcentral.com/api-reference/External-Contacts/createContact
 */
export default async function runAction(nango: NangoAction, input: CreateContact): Promise<Contact> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: createContactSchema, input });

    const config: ProxyConfiguration = {
        // https://developers.ringcentral.com/api-reference/External-Contacts/createContact
        endpoint: '/restapi/v1.0/account/~/extension/~/address-book/contact',
        retries: 3,
        data: parsedInput.data
    };

    const response = await nango.post<RingCentralContactRecord>(config);

    return {
        id: response.data.id.toString(),
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        email: response.data.email,
        phoneNumbers: response.data.phoneNumbers,
        company: response.data.company,
        jobTitle: response.data.jobTitle,
        notes: response.data.notes
    };
}
