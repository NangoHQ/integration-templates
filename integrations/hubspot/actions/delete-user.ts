import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    if (!input.id) {
        throw new nango.ActionError({
            message: 'Id is required'
        });
    }

    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/settings/user-provisioning
        endpoint: `/settings/v3/users/${input.id}`,
        retries: 3
    };

    await nango.delete(config);

    return {
        success: true
    };
}
