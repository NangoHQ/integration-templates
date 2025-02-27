import type { NangoAction, ProxyConfiguration, ActionResponse, CreateContactInput } from '../../models';
import { createContactInputSchema } from '../schema.zod.js';
import { toSalesForceContact } from '../mappers/toContact.js';

export default async function runAction(nango: NangoAction, input: CreateContactInput): Promise<ActionResponse> {
    nango.zodValidate({ zodSchema: createContactInputSchema, input });
    const response = await nango.post(config);

    return response.data;
}
