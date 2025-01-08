import type { IdEntity, NangoAction, ProxyConfiguration, SuccessResponse } from '../../models';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    // Validate input (id must be greater than zero)
    if (input.id <= 0) {
        throw new Error('User ID must be an integer greater than zero.');
    }

    const config: ProxyConfiguration = {
        // Metabase API endpoint to disable a user
        endpoint: `/api/user/${input.id}`,
        retries: 10,
        method: 'DELETE'
    };

    await nango.delete(config);

    return {
        success: true
    };
}
