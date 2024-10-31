import type { NangoAction, ProxyConfiguration, ActionResponse, CreateContactInput } from '../../models';
import { createContactInputSchema } from '../schema.zod.js';
import { toSalesForceContact } from '../mappers/toContact.js';

export default async function runAction(nango: NangoAction, input: CreateContactInput): Promise<ActionResponse> {
    const parsedInput = createContactInputSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a contact: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create a contact'
        });
    }

    const salesforceContact = toSalesForceContact(parsedInput.data);
    const config: ProxyConfiguration = {
        // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_contact.htm
        endpoint: '/services/data/v60.0/sobjects/Contact',
        data: salesforceContact,
        retries: 10
    };
    const response = await nango.post(config);

    return response.data;
}
