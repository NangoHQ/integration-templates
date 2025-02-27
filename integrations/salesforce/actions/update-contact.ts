import type { NangoAction, ProxyConfiguration, SuccessResponse, CreateContactInput } from '../../models';
import { updateContactInputSchema } from '../schema.zod.js';
import { toSalesForceContact } from '../mappers/toContact.js';

export default async function runAction(nango: NangoAction, input: CreateContactInput): Promise<SuccessResponse> {
    nango.zodValidate({ zodSchema: updateContactInputSchema, input });

    await nango.patch(config);

    return {
        success: true
    };
}
