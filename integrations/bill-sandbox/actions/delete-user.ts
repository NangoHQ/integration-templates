import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { getHeaders } from '../helpers/get-headers.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    if (!input.id) {
        throw new nango.ActionError({
            message: 'Id is required to archive a user'
        });
    }

    const headers = await getHeaders(nango);

    const config: ProxyConfiguration = {
        // https://developer.bill.com/reference/archiveorganizationuser
        endpoint: `/users/${input.id}/archive`,
        retries: 10,
        headers: {
            sessionId: headers.sessionId,
            devKey: headers.devKey
        }
    };

    await nango.post(config);

    return {
        success: true
    };
}