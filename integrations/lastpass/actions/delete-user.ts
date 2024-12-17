import type { NangoAction, ProxyConfiguration, SuccessResponse, EmailEntity } from '../../models';
import type { LastPassBody } from '../types';
import { getCredentials } from '../helpers/get-credentials.js';

export default async function runAction(nango: NangoAction, input: EmailEntity): Promise<SuccessResponse> {
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
        retries: 10,
        data: data
    };

    const res = await nango.post(config);

    const isSuccess = res?.data?.status === 'OK';

    return {
        success: isSuccess
    };
}
