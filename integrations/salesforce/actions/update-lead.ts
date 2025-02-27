import type { NangoAction, ProxyConfiguration, SuccessResponse, CreateLeadInput } from '../../models';
import { updateLeadInputSchema } from '../schema.zod.js';
import { toSalesForceLead } from '../mappers/toLead.js';

export default async function runAction(nango: NangoAction, input: CreateLeadInput): Promise<SuccessResponse> {
    nango.zodValidateInput({ zodSchema: updateLeadInputSchema, input });

    await nango.patch(config);

    return {
        success: true
    };
}
