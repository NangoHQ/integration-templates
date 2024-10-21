import type { NangoAction, ProxyConfiguration, User, IntercomCreateUser } from '../../models';
import { toUser } from '../mappers/to-user.js';
import { intercomCreateUserSchema } from '../schema.zod.js';
import type { IntercomContact } from '../types';

/**
 * Creates an Intercom user contact.
 *
 * This function validates the input against the defined schema and constructs a request
 * to the Intercom API to create a new user contact. If the input is invalid, it logs the
 * errors and throws an ActionError.
 *
 * @param {NangoAction} nango - The Nango action context, used for logging and making API requests.
 * @param {IntercomCreateUser} input - The input data for creating a user contact
 *
 * @returns {Promise<User>} - A promise that resolves to the created User object.
 *
 * @throws {nango.ActionError} - Throws an error if the input validation fails.
 *
 * For detailed endpoint documentation, refer to:
 * https://developers.intercom.com/docs/references/rest-api/api.intercom.io/contacts/createcontact
 */
export default async function runAction(nango: NangoAction, input: IntercomCreateUser): Promise<User> {
    const parsedInput = intercomCreateUserSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid input provided to create a user'
        });
    }

    const { firstName, lastName, ...userInput } = parsedInput.data;

    const config: ProxyConfiguration = {
        endpoint: `/contacts`,
        data: {
            ...userInput,
            role: 'user',
            name: `${firstName} ${lastName}`
        },
        retries: 10
    };

    const response = await nango.post<IntercomContact>(config);

    return toUser(response.data);
}
