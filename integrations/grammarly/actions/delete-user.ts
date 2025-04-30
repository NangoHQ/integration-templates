import type { NangoAction, SuccessResponse, EmailEntity, ProxyConfiguration } from '../../models';
import { emailEntitySchema } from '../schema.zod';

export default async function runAction(nango: NangoAction, input: EmailEntity): Promise<SuccessResponse> {
    await nango.zodValidateInput({ zodSchema: emailEntitySchema, input });

    const config: ProxyConfiguration = {
        // https://developer.grammarly.com/license-management-api.html#remove-the-user-from-the-institution
        endpoint: `/users/${input.email}`,
        retries: 3
    };

    await nango.delete(config);

    return {
        success: true
    };
}
