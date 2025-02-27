import type { NangoAction, ProxyConfiguration, User, CreateUser } from '../../models';
import type { LatticeUser } from '../types';
import { createUserSchema } from '../schema.zod.js';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the Lattice SCIM API call to create a new user.
 */
export default async function runAction(nango: NangoAction, input: CreateUser): Promise<User> {
    nango.zodValidateInput({ zodSchema: createUserSchema, input });

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
