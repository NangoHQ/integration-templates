import type { NangoAction, ExactCustomerCreateInput, ExactCustomerCreateOutput } from '../../models';
import type { EO_Account, ResponsePostBody } from '../types';
import { getUser } from '../helpers/get-user.js';
import { exactCustomerCreateInputSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: ExactCustomerCreateInput): Promise<ExactCustomerCreateOutput> {
    nango.zodValidate({ zodSchema: exactCustomerCreateInputSchema, input });

    const create = await nango.post<ResponsePostBody<EO_Account>>({
        endpoint: `/api/v1/${division}/crm/Accounts`,
        data: body,
        retries: 10
    });

    return {
        id: create.data.d.ID
    };
}
