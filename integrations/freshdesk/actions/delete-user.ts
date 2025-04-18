import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { idEntitySchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

    const config: ProxyConfiguration = {
        // https://developer.freshdesk.com/api/#delete_agent
        endpoint: `/api/v2/agents/${input.id}`,
        retries: 3
    };

    await nango.delete(config);

    return {
        success: true
    };
}
