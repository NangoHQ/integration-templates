// eslint-disable-next-line @nangohq/custom-integrations-linting/enforce-proxy-configuration-type
import type { NangoSync, User } from '../../models.js';
import { paginate } from '../helpers/paginate.js';
import { getCredentials } from '../helpers/get-credentials.js';
import type { ReturnedUser } from '../types.js';
import { toUser } from '../mappers/to-user.js';

export default async function fetchData(nango: NangoSync) {
    const credentials = await getCredentials(nango);
    const paginationParams = {
        // https://support.lastpass.com/s/document-item?language=en_US&bundleId=lastpass&topicId=LastPass%2Fapi_get_user_data.html&_LANG=enus
        endpoint: '/enterpriseapi.php',
        cid: credentials.cid,
        provhash: credentials.provhash,
        cmd: 'getuserdata',
        pageSize: 100
    };

    const generator = paginate<ReturnedUser>(nango, paginationParams);
    for await (const { results } of generator) {
        const users: User[] = toUser(results);
        await nango.batchSave(users, 'User');
    }
}
