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
    const parsedInput = createContactSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a contact: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid input provided to create a contact'
        });
    }

    const { email, phone, mobile } = parsedInput.data;

    if (!email && !phone && !mobile) {
        await nango.log('At least one of email, phone, or mobile must be provided.', { level: 'error' });

        throw new nango.ActionError({
            message: 'At least one of email, phone, or mobile must be provided.'
        });
    }

    const config: ProxyConfiguration = {
        // https://developer.freshdesk.com/api/#create_contact
        endpoint: `/api/v2/contacts`,
        data: parsedInput.data,
        retries: 10
    };

    const response = await nango.post<FreshdeskContact>(config);

    const { data: freshdeskContact } = response;

    return toContact(freshdeskContact);
}
