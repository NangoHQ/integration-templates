import type { NangoAction, ProxyConfiguration, User, CreateUser } from '../../models';
import type { ZapierUser } from '../types';
import { createUserSchema } from '../schema.zod.js';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the Zapier API call to create a new user.
 */
export default async function runAction(nango: NangoAction, input: CreateUser): Promise<User> {
    const parsedInput = createUserSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid input provided to create a user'
        });
    }

    const config: ProxyConfiguration = {
        // https://help.zapier.com/hc/en-us/articles/8496291497741-Provision-user-accounts-with-SCIM#h_01HE8NPZMWDB3JG39AKV820GCX
        endpoint: 'Users',
        baseUrlOverride: 'https://zapier.com/scim/v2',
        data: {
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
            name: {
                givenName: parsedInput.data.firstName,
                familyName: parsedInput.data.lastName
            },
            userName: parsedInput.data.email,
            emails: [
                {
                    primary: true,
                    value: parsedInput.data.email
                }
            ]
        },
        retries: 10
    };

    const response = await nango.post<ZapierUser>(config);

    const newUser = response.data;

    const user: User = {
        id: newUser?.id ? newUser.id.toString() : '',
        firstName: newUser?.name?.givenName || '',
        lastName: newUser?.name?.familyName || '',
        email: parsedInput.data.email
    };

    return user;
}
