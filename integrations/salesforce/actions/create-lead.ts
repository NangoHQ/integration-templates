import type { NangoAction, ProxyConfiguration, ActionResponse, CreateLeadInput } from '../../models';
import { createLeadInputSchema } from '../schema.zod.js';
import { toSalesForceLead } from '../mappers/toLead.js';

export default async function runAction(nango: NangoAction, input: CreateLeadInput): Promise<ActionResponse> {
    nango.zodValidateInput({ zodSchema: createLeadInputSchema, input });
    const response = await nango.post(config);

    return response.data;
}
