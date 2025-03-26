import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    if (!input || !input.id) {
        throw new nango.ActionError({
            message: 'Id is required'
        });
    }

    const config: ProxyConfiguration = {
        // https://developer.aircall.io/api-references/#delete-a-user
        endpoint: `/v1/users/${input.id}`,
        retries: 3
    };

    await nango.delete(config);

    return {
        success: true
    };
}
