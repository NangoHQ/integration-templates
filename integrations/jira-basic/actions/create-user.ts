import { createAction } from 'nango';
import type { JiraCreatedUser } from '../types.js';
import { jiraCreateUserSchema } from '../schema.zod.js';

import type { ProxyConfiguration } from 'nango';
import { User, JiraCreateUser } from '../models.js';

const action = createAction({
    description:
        "Creates a user in Jira. Note that this endpoint is marked as experimental and could \nbe deprecated in the future. Products are optional and allowed params are\njira-core, jira-servicedesk, jira-product-discovery, jira-software. Defaults to \njira-software. Note that the last name isn't able to be set via the API and \nthe first name defaults to the email address.",
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/users',
        group: 'Users'
    },

    input: JiraCreateUser,
    output: User,

    exec: async (nango, input): Promise<User> => {
        await nango.zodValidateInput({ zodSchema: jiraCreateUserSchema, input });

        const { email, ...rest } = input;

        const inputData = {
            ...rest,
            emailAddress: email,
            // displayName isn't respected unfortunately and the first name
            // just comes from the email address
            displayName: `${rest['firstName']} ${rest['lastName']}`,
            products: rest['products'] || ['jira-software']
        };

        const config: ProxyConfiguration = {
            // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-users/#api-rest-api-3-user-post
            endpoint: 'rest/api/3/user',
            data: inputData,
            retries: 3
        };
        const response = await nango.post<JiraCreatedUser>(config);

        const { data } = response;

        const [firstName, lastName] = data.displayName.split(' ');
        const user: User = {
            id: data.accountId,
            firstName: firstName || '',
            lastName: lastName || '',
            email: data.emailAddress || ''
        };

        return user;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
