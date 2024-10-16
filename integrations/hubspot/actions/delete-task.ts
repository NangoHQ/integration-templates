import type { NangoAction, ProxyConfiguration, Id, SuccessResponse } from '../../models';

export default async function runAction(nango: NangoAction, input: Id): Promise<SuccessResponse> {
    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/crm/tasks
        endpoint: `/crm/v3/objects/tasks/${input.id}`,
        retries: 10
    };
    await nango.delete(config);

    return {
        success: true
    };
}
