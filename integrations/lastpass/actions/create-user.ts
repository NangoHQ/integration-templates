import type { NangoAction, User, LastPassCreateUser, ProxyConfiguration, ActionResponseError } from '../../models';
import type { LastPassBody, LastPassCreateNewUser, LastPassResponse } from '../types';
import { getCredentials } from '../helpers/get-credentials.js';
import { lastPassCreateUserSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: LastPassCreateUser): Promise<User> {
    await nango.zodValidateInput({ zodSchema: lastPassCreateUserSchema, input });

    const createUser: LastPassCreateNewUser = {
        username: input.email,
        fullname: `${input.firstName} ${input.lastName}`,
        ...(input.groups && { groups: input.groups }),
        ...(input.duousername && { duousername: input.duousername }),
        ...(input.securidusername && { securidusername: input.securidusername }),
        ...(input.password && { password: input.password }),
        ...(input.password_reset_required !== undefined && {
            password_reset_required: input.password_reset_required
        })
    };

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
        retries: 3
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
