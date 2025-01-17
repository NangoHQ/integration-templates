import type { NangoAction, ProxyConfiguration, User, CreateUser } from '../../models';
import { toUser } from '../mappers/to-user.js';
import { createUserSchema } from '../schema.zod.js';
import type { LucidUser } from '../types';

/**
 * Creates a Lucid user.
 *
 * This function validates the input against the defined schema and constructs a request
 * to the Lucid API to create a new user. If the input is invalid, it logs the
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
 * https://lucid.readme.io/reference/overview-scim
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

    const { firstName, lastName, email } = parsedInput.data;

    const config: ProxyConfiguration = {
        // https://lucid.readme.io/reference/createuser-1
        endpoint: `/v2/Users`,
        data: {
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
            userName: email,
            name: {
                givenName: firstName,
                familyName: lastName,
                formatted: `${firstName} ${lastName}`
            },
            displayName: email,
            emails: [
                {
                    value: email,
                    primary: true
                }
            ]
        },
        retries: 10
    };

    const response = await nango.post<LucidUser>(config);

    return toUser(response.data);
}
