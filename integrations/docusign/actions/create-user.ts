import type { NangoAction, ProxyConfiguration, DocuSignCreateUser, User } from '../../models';
import { getRequestInfo } from '../helpers/get-request-info.js';
import { docuSignCreateUserSchema } from '../schema.zod.js';
import type { DocuSignUser } from '../types';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the API call to create a new user.
 */
export default async function runAction(nango: NangoAction, input: DocuSignCreateUser): Promise<User> {
    const parsedInput = docuSignCreateUserSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid input provided to create a user'
        });
    }

    const { baseUri, accountId } = await getRequestInfo(nango);

    const newUsers = [
        {
            ...parsedInput.data,
            userName: input.userName ?? `${parsedInput.data.firstName} ${parsedInput.data.lastName}`
        }
    ];

    const config: ProxyConfiguration = {
        baseUrlOverride: baseUri,
        // https://developers.docusign.com/docs/esign-rest-api/reference/users/users/create/
        endpoint: `/restapi/v2.1/accounts/${accountId}/users`,
        data: {
            newUsers
        },
        retries: 10
    };

    const response = await nango.post<{ newUsers: DocuSignUser[] }>(config);
    const {
        data: { newUsers: createdUsers }
    } = response;

    const docuSignUser = createdUsers[0];
    const [firstNameExtracted, lastNameExtracted] = (docuSignUser?.userName ?? '').split(' ');

    const user: User = {
        id: docuSignUser?.userId || '',
        firstName: docuSignUser?.firstName || firstNameExtracted || '',
        lastName: docuSignUser?.lastName || lastNameExtracted || '',
        email: docuSignUser?.email || ''
    };

    return user;
}
