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

    const { accountId, ...newUser } = input;

    const config: ProxyConfiguration = {
        // https://developers.docusign.com/docs/esign-rest-api/reference/users/users/create/
        endpoint: `/restapi/v2.1/accounts/${input.accountId}/users`,
        data: {
            newUsers: [newUser]
        },
        retries: 10
    };

    const response = await nango.post<DocuSignUser>(config);
    const { data } = response;
    const user: User = {
        id: data.userId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email
    };

    return user;
}
