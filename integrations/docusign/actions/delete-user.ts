import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { getRequestInfo } from '../helpers/get-request-info.js';
import { idEntitySchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

    const { baseUri, accountId } = await getRequestInfo(nango);

    const config: ProxyConfiguration = {
        baseUrlOverride: baseUri,
        // https://developers.docusign.com/docs/esign-rest-api/reference/users/users/delete/
        endpoint: `/restapi/v2.1/accounts/${accountId}/users`,
        data: {
            users: [{ userId: input.id }]
        },
        retries: 3
    };

    await nango.delete(config);

    return {
        success: true
    };
}
