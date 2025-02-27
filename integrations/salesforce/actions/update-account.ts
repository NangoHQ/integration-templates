import type { NangoAction, ProxyConfiguration, SuccessResponse, CreateAccountInput } from '../../models';
import { updateAccountInputSchema } from '../schema.zod.js';
import { toSalesForceAccount } from '../mappers/toAccount.js';

export default async function runAction(nango: NangoAction, input: CreateAccountInput): Promise<SuccessResponse> {
    nango.zodValidate({ zodSchema: updateAccountInputSchema, input });

    await nango.patch(config);

    return {
        success: true
    };
}
