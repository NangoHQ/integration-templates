import { createAction } from 'nango';
import { getRequestInfo } from '../helpers/get-request-info.js';
import { docuSignCreateUserSchema } from '../schema.zod.js';
import type { DocuSignUser } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User, DocuSignCreateUser } from '../models.js';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the API call to create a new user.
 */
const action = createAction({
    description: 'Creates a user in DocuSign',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/users',
        group: 'Users'
    },

    input: DocuSignCreateUser,
    output: User,
    scopes: ['openid', 'signature'],

    exec: async (nango, input): Promise<User> => {
        await nango.zodValidateInput({ zodSchema: docuSignCreateUserSchema, input });

        const { baseUri, accountId } = await getRequestInfo(nango);

        const newUsers = [
            {
                ...input,
                userName: input.userName ?? `${input.firstName} ${input.lastName}`
            }
        ];

        const config: ProxyConfiguration = {
            baseUrlOverride: baseUri,
            // https://developers.docusign.com/docs/esign-rest-api/reference/users/users/create/
            endpoint: `/restapi/v2.1/accounts/${accountId}/users`,
            data: {
                newUsers
            },
            retries: 3
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
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
