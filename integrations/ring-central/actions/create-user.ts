import type { NangoAction, ProxyConfiguration, User, RingCentralCreateUser } from '../../models.js';
import { toUser } from '../mappers/to-user.js';
import { ringCentralCreateUserSchema } from '../schema.zod.js';
import type { RingCentralUser } from '../types.js';

/**
 * Creates an RingCentral user.
 *
 * This function validates the input against the defined schema and constructs a request
 * to the RingCentral API to create a new user. If the input is invalid, it logs the
 * errors and throws an ActionError.
 *
 * @param {NangoAction} nango - The Nango action context, used for logging and making API requests.
 * @param {RingCentralCreateUser} input - The input data for creating a user contact
 *
 * @returns {Promise<User>} - A promise that resolves to the created User object.
 *
 * @throws {nango.ActionError} - Throws an error if the input validation fails.
 *
 * For detailed endpoint documentation, refer to:
 * https://developers.ringcentral.com/api-reference/SCIM/scimCreateUser2
 */
export default async function runAction(nango: NangoAction, input: RingCentralCreateUser): Promise<User> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: ringCentralCreateUserSchema, input });

    const { firstName, lastName, email, ...data } = parsedInput.data;

    const config: ProxyConfiguration = {
        // https://developers.ringcentral.com/api-reference/SCIM/scimCreateUser2
        endpoint: `/scim/v2/Users`,
        data: {
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
            userName: email, // MUST be same as work type email address
            emails: [
                {
                    type: 'work',
                    value: email
                }
            ],
            name: {
                givenName: firstName,
                familyName: lastName
            },
            ...data
        },
        retries: 3
    };

    const response = await nango.post<RingCentralUser>(config);

    return toUser(response.data);
}
