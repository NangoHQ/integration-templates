import type { NangoAction, ProxyConfiguration, LatticeCreateUser, User } from '../../models';
import type { LatticeUser } from '../types';
import { latticeCreateUserSchema } from '../schema.zod.js';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the Lattice SCIM API call to create a new user.
 */
export default async function runAction(nango: NangoAction, input: LatticeCreateUser): Promise<User> {
    const parsedInput = latticeCreateUserSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid input provided to create a user'
        });
    }

    const config: ProxyConfiguration = {
        // https://developers.toriihq.com/docs/lattice-create-lattice-user
        endpoint: 'scim/v2/Users',
        data: {
            schemas: [
                'urn:ietf:params:scim:schemas:core:2.0:User',
                'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User',
                'urn:ietf:params:scim:schemas:extension:lattice:attributes:1.0:User'
            ],
            name: {
                givenName: parsedInput.data.firstName,
                familyName: parsedInput.data.lastName
            },
            userName: parsedInput.data.email,
            active: true,
            emails: [
                {
                    type: 'work',
                    value: parsedInput.data.email
                }
            ]
        },
        retries: 10
    };

    const response = await nango.post<LatticeUser>(config);

    const newUser = response.data;

    const [firstName, ...lastNameParts] = (newUser?.name || '').split(' ');

    const user: User = {
        id: newUser?.id ? newUser.id.toString() : '',
        firstName: firstName || '',
        lastName: lastNameParts.join(' ') || '',
        email: parsedInput.data.email
    };

    return user;
}
