import type { NangoAction, ProxyConfiguration, CreateUser, User } from '../../models';
import type { SmartsheetCreatedUser } from '../types';
import { createUserSchema } from '../schema.zod.js';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the Smartsheet API call to create a new user.
 */
export default async function runAction(nango: NangoAction, input: CreateUser): Promise<User> {
    nango.zodValidateInput({ zodSchema: createUserSchema, input });

    const response = await nango.post<SmartsheetCreatedUser>(config);

    const newUser = response.data;
    const user: User = {
        id: newUser.result.id ? newUser.result.id.toString() : '',
        firstName: parsedInput.data.firstName,
        lastName: parsedInput.data.lastName,
        email: parsedInput.data.email
    };

    return user;
}
