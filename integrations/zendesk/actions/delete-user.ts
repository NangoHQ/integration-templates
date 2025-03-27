import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { getSubdomain } from '../helpers/get-subdomain.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    if (!input.id) {
        throw new nango.ActionError({
            message: 'Id is required to delete a user'
        });
    }

    const subdomain = await getSubdomain(nango);

    const config: ProxyConfiguration = {
        baseUrlOverride: `https://${subdomain}.zendesk.com`,
        // https://developer.zendesk.com/api-reference/ticketing/users/users/#delete-user
        endpoint: `/api/v2/users/${input.id}`,
        retries: 3
    };

    await nango.delete(config);

    return {
        success: true
    };
}
