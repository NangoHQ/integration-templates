import type { NangoAction, ProxyConfiguration, JiraCreateUser, ActionResponseError, User } from '../../models';
import type { JiraCreatedUser } from '../types';
import { jiraCreateUserSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: JiraCreateUser): Promise<User> {
    nango.zodValidate({ zodSchema: jiraCreateUserSchema, input });

    const config: ProxyConfiguration = {
        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-users/#api-rest-api-3-user-post
        endpoint: 'rest/api/3/user',
        data: inputData,
        retries: 10
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
