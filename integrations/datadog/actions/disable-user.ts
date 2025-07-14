import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    if (!input || !input.id) {
        throw new nango.ActionError({
            message: 'Id is required'
        });
    }

    const config: ProxyConfiguration = {
        // https://docs.datadoghq.com/api/latest/users/?code-lang=typescript#disable-a-user
        endpoint: `/v2/users/${input.id}`,
        retries: 3
    };

    await nango.delete(config);

    return {
        success: true
    };
}
