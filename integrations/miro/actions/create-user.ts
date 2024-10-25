import type { NangoAction, ProxyConfiguration, User, CreateUser } from '../../models';
import { toUser } from '../mappers/to-user.js';
import { createUserSchema } from '../schema.zod.js';
import type { MiroUser } from '../types';

/**
 * Creates a new user in Miro
 *
 * This function validates the input against the defined schema and constructs a request
 * to the Miro API to create a user. If the input is invalid, it logs the
 * errors and throws an ActionError.
 *
 * @param {NangoAction} nango - The Nango action context, used for logging and making API requests.
 * @param {CreateUser} input - The input data for creating a user contact
 *
 * @returns {Promise<User>} - A promise that resolves to the created User object.
 *
 * @throws {nango.ActionError} - Throws an error if the input validation fails.
 *
 * For detailed endpoint documentation, refer to:
 * https://developers.miro.com/docs/users#create-a-new-user
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

    const { email, firstName, lastName } = parsedInput.data;

    const config: ProxyConfiguration = {
        baseUrlOverride: 'https://miro.com/api',
        endpoint: `/v1/scim/Users`,
        data: {
            userName: email,
            name: {
                familyName: lastName,
                givenName: firstName
            }
        },
        retries: 10
    };

    const response = await nango.post<MiroUser>(config);

    return toUser(response.data);
}
