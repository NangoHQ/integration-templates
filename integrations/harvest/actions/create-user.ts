import type { NangoAction, ProxyConfiguration, User, HarvestCreateUser } from '../../models';
import { toUser } from '../mappers/to-user';
import { harvestCreateUserSchema } from '../schema.zod.js';
import type { HarvestUser } from '../types';

/**
 * Creates a Haverst user.
 *
 * This function validates the input against the defined schema and constructs a request
 * to the Harvest API to create a new user contact. If the input is invalid, it logs the
 * errors and throws an ActionError.
 *
 * @param {NangoAction} nango - The Nango action context, used for logging and making API requests.
 * @param {HaverstCreateUser} input - The input data for creating a user contact
 *
 * @returns {Promise<User>} - A promise that resolves to the created User object.
 *
 * @throws {nango.ActionError} - Throws an error if the input validation fails.
 *
 * For detailed endpoint documentation, refer to:
 * https://help.getharvest.com/api-v2/users-api/users/users/#create-a-user
 */
export default async function runAction(nango: NangoAction, input: HarvestCreateUser): Promise<User> {
    const parsedInput = harvestCreateUserSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid input provided to create a user'
        });
    }

    const config: ProxyConfiguration = {
        endpoint: `/v2/users`,
        data: parsedInput.data,
        retries: 10
    };

    const response = await nango.post<HarvestUser>(config);
    const { data } = response;

    return toUser(data);
}
