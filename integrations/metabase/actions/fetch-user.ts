import type { IdEntity, NangoAction, ProxyConfiguration, SuccessResponse } from '../../models';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    if (input.id <= 0) {
        throw new Error('User ID must be an integer greater than zero.');
    }

    const config: ProxyConfiguration = {
        // https://www.metabase.com/docs/latest/api/user
        endpoint: `/api/user/${input.id}`,
        retries: 10
    };

    const response = await nango.get(config);

    return response.data;
}
