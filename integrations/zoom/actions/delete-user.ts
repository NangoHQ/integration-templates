import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    if (!input.id) {
        throw new nango.ActionError({
            message: 'Id is required to delete a user'
        });
    }

    const config: ProxyConfiguration = {
        // https://developers.zoom.us/docs/api/rest/reference/user/methods/#operation/userDelete
        endpoint: `/users/${input.id}`,
        retries: 3
    };

    await nango.delete(config);

    return {
        success: true
    };
}
