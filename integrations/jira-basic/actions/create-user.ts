import type { NangoAction, ProxyConfiguration, JiraCreateUser, ActionResponseError, User } from '../../models';
import type { JiraCreatedUser } from '../types';
import { jiraCreateUserSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: JiraCreateUser): Promise<User> {
    const parsedInput = jiraCreateUserSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError<ActionResponseError>({
            message: 'Invalid input provided to create a user'
        });
    }

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