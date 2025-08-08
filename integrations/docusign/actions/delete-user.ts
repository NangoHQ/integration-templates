import { createAction } from 'nango';
import { getRequestInfo } from '../helpers/get-request-info.js';
import { idEntitySchema } from '../schema.zod.js';

import type { ProxyConfiguration } from 'nango';
import { SuccessResponse, IdEntity } from '../models.js';

const action = createAction({
    description: 'Deletes a user in DocuSign',
    version: '2.0.0',

    endpoint: {
        method: 'DELETE',
        path: '/users',
        group: 'Users'
    },

    input: IdEntity,
    output: SuccessResponse,
    scopes: ['openid', 'signature'],

    exec: async (nango, input): Promise<SuccessResponse> => {
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
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
