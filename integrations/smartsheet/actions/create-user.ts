import type { NangoAction, ProxyConfiguration, CreateUser, User } from '../../models';
import type { SmartsheetCreatedUser } from '../types';
import { createUserSchema } from '../schema.zod.js';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the Smartsheet API call to create a new user.
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
        // https://smartsheet.redoc.ly/tag/users/#operation/add-user
        endpoint: '/2.0/users',
        data: {
            admin: false,
            licensedSheetCreator: false,
            firstName: parsedInput.data.firstName,
            lastName: parsedInput.data.lastName,
            email: parsedInput.data.email
        },
        retries: 10
    };

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
