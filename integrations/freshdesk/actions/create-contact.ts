import type { NangoAction, ProxyConfiguration, Contact, CreateContact } from '../../models';
import { createContactSchema } from '../schema.zod.js';
import type { FreshdeskContact } from '../types';
import { toContact } from '../mappers/to-contact.js';

/**
 * Creates a new user in Freshdesk by validating input data against a schema,
 * sending a request to the Freshdesk API, logging any validation errors, and
 * returning a common Nango Contact object
 *
 * Create user Freshdesk API docs: https://developer.freshdesk.com/api/#create_contact
 *
 */
export default async function runAction(nango: NangoAction, input: CreateContact): Promise<Contact> {
    nango.zodValidateInput({ zodSchema: createContactSchema, input });

    const response = await nango.post<FreshdeskContact>(config);

    const { data: freshdeskContact } = response;

    return toContact(freshdeskContact);
}
