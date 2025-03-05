import type { NangoAction, ProxyConfiguration, SuccessResponse, CreateContactInput } from '../../models';
import { updateContactInputSchema } from '../schema.zod.js';
import { toSalesForceContact } from '../mappers/toContact.js';

export default async function runAction(nango: NangoAction, input: CreateContactInput): Promise<SuccessResponse> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: updateContactInputSchema, input });

    const salesforceContact = toSalesForceContact(parsedInput.data);
    const config: ProxyConfiguration = {
        // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_contact.htm
        endpoint: `/services/data/v60.0/sobjects/Contact/${parsedInput.data.id}`,
        data: salesforceContact,
        retries: 10
    };

    await nango.patch(config);

    return {
        success: true
    };
}
