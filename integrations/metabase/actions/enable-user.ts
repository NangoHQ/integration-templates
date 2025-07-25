import type { IdEntity, NangoAction, ProxyConfiguration, SuccessResponse } from '../../models.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    const fetchConfig: ProxyConfiguration = {
        // https://www.metabase.com/docs/latest/api/user
        endpoint: `/api/user/${input.id}`,
        retries: 3
    };

    const userResponse = await nango.get(fetchConfig);

    if (!userResponse || !userResponse.data) {
        throw new nango.ActionError({
            message: `User with ID ${input.id} not found.`,
            statusCode: 404
        });
    }

    const user = userResponse.data;

    if (user.is_active) {
        await nango.log(`User with ID ${input.id} is already active.`);
        return {
            success: true
        };
    }

    const reactivateConfig: ProxyConfiguration = {
        // https://www.metabase.com/docs/latest/api/user
        endpoint: `/api/user/${input.id}/reactivate`,
        retries: 3
    };

    await nango.put<SuccessResponse>(reactivateConfig);

    return {
        success: true
    };
}
