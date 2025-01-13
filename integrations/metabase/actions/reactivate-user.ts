import type { IdEntity, NangoAction, ProxyConfiguration, SuccessResponse } from '../../models';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    // Step 1: Fetch user details
    const fetchConfig: ProxyConfiguration = {
        // https://www.metabase.com/docs/latest/api/user/${input.id}/
        endpoint: `/api/user/${input.id}`,
        retries: 10
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
        // https://www.metabase.com/docs/latest/api/user/${input.id}/reactivate
        endpoint: `/api/user/${input.id}/reactivate`,
        method: 'PUT',
        retries: 5
    };

    await nango.put<SuccessResponse>(reactivateConfig);

    await nango.log(`User reactivated with ID: ${input.id}`);

    return {
        success: true
    };
}
