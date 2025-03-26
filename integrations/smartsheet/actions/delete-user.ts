import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { idEntitySchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

    const config: ProxyConfiguration = {
        // https://smartsheet.redoc.ly/tag/users/#operation/remove-user
        endpoint: `/2.0/users/${encodeURIComponent(parsedInput.data.id)}`,
        retries: 3
    };

    await nango.delete(config);

    return {
        success: true
    };
}
