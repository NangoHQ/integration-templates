import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { idEntitySchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

    const config: ProxyConfiguration = {
        // https://developers.dialpad.com/reference/usersdelete
        endpoint: `/v2/users/${input.id}`,
        retries: 10
    };

    await nango.delete(config);

    return {
        success: true
    };
}
