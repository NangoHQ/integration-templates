import type { NangoAction, ProxyConfiguration, ActionResponse, CreateAccountInput } from '../../models';
import { createAccountInputSchema } from '../schema.zod.js';
import { toSalesForceAccount } from '../mappers/toAccount.js';

export default async function runAction(nango: NangoAction, input: CreateAccountInput): Promise<ActionResponse> {
    nango.zodValidate({ zodSchema: createAccountInputSchema, input });
    const response = await nango.post(config);

    return response.data;
}
