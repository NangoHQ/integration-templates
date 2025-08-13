import { createAction } from 'nango';
import type { LastPassBody } from '../types.js';
import { getCredentials } from '../helpers/get-credentials.js';

import type { ProxyConfiguration } from 'nango';
import { SuccessResponse, EmailEntity } from '../models.js';

const action = createAction({
    description: 'Deletes a user in Lastpass.',
    version: '1.0.0',

    endpoint: {
        method: 'DELETE',
        path: '/users',
        group: 'Users'
    },

    input: EmailEntity,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
        if (!input.email) {
            throw new nango.ActionError({
                message: 'Email is required to delete a user'
            });
        }
        const credentials = await getCredentials(nango);
        const data: LastPassBody = {
            cid: credentials.cid,
            provhash: credentials.provhash,
            cmd: 'deluser',
            data: {
                username: input.email,
                deleteaction: 2 // Delete user. Deletes the account entirely.
            }
        };
        const config: ProxyConfiguration = {
            // https://support.lastpass.com/s/document-item?language=en_US&bundleId=lastpass&topicId=LastPass/api_delete_user.html&_LANG=enus
            endpoint: `/enterpriseapi.php`,
            retries: 3,
            data: data
        };

        const res = await nango.post(config);

        const isSuccess = res?.data?.status === 'OK';

        return {
            success: isSuccess
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
