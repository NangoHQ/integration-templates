import type { NangoAction, ProxyConfiguration, User, RingCentralCreateUser } from '../../models';
import { toUser } from '../mappers/to-user.js';
import { ringCentralCreateUserSchema } from '../schema.zod.js';
import type { RingCentralUser } from '../types';

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
    nango.zodValidate({ zodSchema: ringCentralCreateUserSchema, input });

    const response = await nango.post<RingCentralUser>(config);

    return toUser(response.data);
}
