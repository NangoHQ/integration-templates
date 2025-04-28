import type { NangoAction, SuccessResponse, EmailEntity, ProxyConfiguration } from '../../models';

export default async function runAction(nango: NangoAction, input: EmailEntity): Promise<SuccessResponse> {
    if (!input || !input.email) {
        throw new nango.ActionError({
            message: 'Email is required to delete a user'
        });
    }

    const config: ProxyConfiguration = {
        // https://developer.grammarly.com/license-management-api.html#remove-the-user-from-the-institution
        endpoint: `/users/${input.email}`,
        retries: 10
    };

    await nango.delete(config);

    return {
        success: true
    };
}
