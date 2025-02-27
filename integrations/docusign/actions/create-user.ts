import type { NangoAction, DocuSignCreateUser, User } from '../../models';
import { docuSignCreateUserSchema } from '../schema.zod.js';
import type { DocuSignUser } from '../types';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the API call to create a new user.
 */
export default async function runAction(nango: NangoAction, input: DocuSignCreateUser): Promise<User> {
    nango.zodValidateInput({ zodSchema: docuSignCreateUserSchema, input });

    const config = {
        // https://developers.docusign.com/docs/admin-api/reference/users/users/create/
        endpoint: '/v2.1/accounts/users',
        data: {
            newUsers: [input]
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
