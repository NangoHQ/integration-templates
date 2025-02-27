import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { getRequestInfo } from '../helpers/get-request-info.js';
import { idEntitySchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    nango.zodValidateInput({ zodSchema: idEntitySchema, input });

    await nango.delete(config);

    return {
        success: true
    };
}
