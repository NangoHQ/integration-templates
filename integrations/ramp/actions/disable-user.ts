import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { idEntitySchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

    const config: ProxyConfiguration = {
        // https://docs.ramp.com/developer-api/v1/api/users#patch-developer-v1-users-user-id-deactivate
        endpoint: `/developer/v1/users/${encodeURIComponent(parsedInput.data.id)}/deactivate`,
        retries: 10
    };

    await nango.patch(config);

    return {
        success: true
    };
}
