import type { NangoAction, User, LastPassCreateUser, ProxyConfiguration } from '../../models';
import type { ActionResponseError } from '../.nango/schema';
import type { LastPassBody, LastPassCreateNewUser, LastPassResponse } from '../types';
import { getCredentials } from '../helpers/get-credentials.js';
import { lastPassCreateUserSchema } from '../../schema.zod.js';

export default async function runAction(nango: NangoAction, input: LastPassCreateUser): Promise<User> {
    nango.zodValidateInput({ zodSchema: lastPassCreateUserSchema, input });

    const credentials = await getCredentials(nango);
    const lastPassInput: LastPassBody = {
        cid: credentials.cid,
        provhash: credentials.provhash,
        cmd: 'batchadd',
        data: [createUser]
    };

    const config: ProxyConfiguration = {
        // https://support.lastpass.com/s/document-item?language=en_US&bundleId=lastpass&topicId=LastPass/api_add_users.html&_LANG=enus
        endpoint: `/enterpriseapi.php`,
        data: lastPassInput,
        retries: 10
    };
    const response = await nango.post<LastPassResponse>(config);

    const isSuccess = response?.data?.status === 'OK';

    // we dont have an Id present in the user's object, so we will use the email as the id
    const user: User = {
        id: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email
    };

    if (isSuccess) {
        return user;
    } else {
        const errorMessages = response?.data?.error?.join(', ') || 'Unknown error';
        throw new nango.ActionError<ActionResponseError>({
            message: `Failed to create user in LastPass: ${errorMessages}`
        });
    }
}
