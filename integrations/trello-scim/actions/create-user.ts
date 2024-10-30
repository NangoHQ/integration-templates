import type { NangoAction, ProxyConfiguration, User, CreateUser } from '../../models';
import { toUser } from '../mappers/to-user.js';
import type { TrelloUser } from '../types';
import { createUserSchema } from '../schema.zod.js';

/**
 * Creates a Trello user.
 *
 * This function validates the input against the defined schema and constructs a request
 * to the Trello SCIM API to create a new user. If the input is invalid, it logs the
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
 * https://developer.atlassian.com/cloud/trello/scim/routes/#create-a-new-user
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
        // https://developer.atlassian.com/cloud/trello/scim/routes/#create-a-new-user
        endpoint: `/scim/v2/Users`,
        data: {
            emails: [
                {
                    value: email
                }
            ],
            name: {
                givenName: firstName,
                familyName: lastName
            }
        },
        retries: 10
    };

    const response = await nango.post<TrelloUser>(config);

    return toUser(response.data);
}
