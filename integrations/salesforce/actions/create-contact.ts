import type { NangoAction, ProxyConfiguration, ActionResponse, CreateContactInput } from '../../models';
import { createContactInputSchema } from '../schema.zod.js';
import { toSalesForceContact } from '../mappers/toContact.js';

export default async function runAction(nango: NangoAction, input: CreateContactInput): Promise<ActionResponse> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: createContactInputSchema, input });

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
