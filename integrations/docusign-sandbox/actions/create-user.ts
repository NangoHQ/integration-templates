import type { NangoAction, ProxyConfiguration, DocuSignCreateUser, User } from '../../models';
import { docuSignCreateUserSchema } from '../schema.zod.js';
import { DocuSignUser } from '../types';

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

    const { accountId, ...newUser } = parsedInput.data;

    const config: ProxyConfiguration = {
        // https://developers.docusign.com/docs/esign-rest-api/reference/users/users/create/
        endpoint: `/restapi/v2.1/accounts/${parsedInput.data.accountId}/users`,
        data: {
            newUsers: [newUser]
        },
        retries: 10
    };

    const response = await nango.post<{ newUsers: DocuSignUser[] }>(config);
    const {
        data: { newUsers }
    } = response;

    const docuSignUser = newUsers[0];
    const [firstNameExtracted, lastNameExtracted] = (docuSignUser?.userName ?? '').split(' ');

    const user: User = {
        id: docuSignUser?.userId || '',
        firstName: docuSignUser?.firstName || firstNameExtracted || '',
        lastName: docuSignUser?.lastName || lastNameExtracted || '',
        email: docuSignUser?.email || ''
    };

    return user;
}
