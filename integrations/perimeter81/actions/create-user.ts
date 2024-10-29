import type { NangoAction, ProxyConfiguration, User, Perimeter81CreateUser } from '../../models';
import { toUser } from '../mappers/to-user.js';
import { perimeter81CreateUserSchema } from '../schema.zod.js';
import type { Perimeter81User } from '../types';

/**
 * Creates an Perimeter81 user.
 *
 * This function validates the input against the defined schema and constructs a request
 * to the Perimeter81 API to create a new user. If the input is invalid, it logs the
 * errors and throws an ActionError.
 *
 * @param {NangoAction} nango - The Nango action context, used for logging and making API requests.
 * @param {Perimeter81CreateUser} input - The input data for creating a user contact
 *
 * @returns {Promise<User>} - A promise that resolves to the created User object.
 *
 * @throws {nango.ActionError} - Throws an error if the input validation fails.
 *
 * For detailed endpoint documentation, refer to:
 * https://support.perimeter81.com/docs/post-new-member
 */
export default async function runAction(nango: NangoAction, input: Perimeter81CreateUser): Promise<User> {
    const parsedInput = perimeter81CreateUserSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid input provided to create a user'
        });
    }

    const { firstName, lastName, profileData = {}, ...data } = parsedInput.data;

    const config: ProxyConfiguration = {
        // https://support.perimeter81.com/docs/post-new-member
        endpoint: `/v1/users`,
        data: {
            ...data,
            profileData: {
                ...profileData,
                firstName,
                lastName
            }
        },
        retries: 10
    };

    const response = await nango.post<Perimeter81User>(config);

    return toUser(response.data);
}
