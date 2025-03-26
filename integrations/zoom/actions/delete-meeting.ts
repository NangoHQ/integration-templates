import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    if (!input.id) {
        throw new nango.ActionError({
            message: 'Id is required to delete a meeting'
        });
    }

    const config: ProxyConfiguration = {
        // https://developers.zoom.us/docs/api/meetings/#tag/meetings/DELETE/meetings/{meetingId}
        endpoint: `/meetings/${input.id}`,
        retries: 3
    };

    await nango.delete(config);

    return {
        success: true
    };
}
