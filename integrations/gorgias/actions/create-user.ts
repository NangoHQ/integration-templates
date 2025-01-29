import type { NangoAction, ProxyConfiguration, GorgiasCreateUser, GorgiasUser } from '../../models';
import { gorgiasCreateUserSchema } from '../schema.zod.js';
import type { GorgiasCreateUserReq, GorgiasUserResponse } from '../types';

/**
 * Creates a new user in Gorgias.
 *
 * @param {NangoAction} nango - The Nango action instance.
 * @param {GorgiasCreateUser} input - The input data for creating a user.
 * @returns {Promise<GorgiasUser>} - A promise that resolves to the created Gorgias user.
 * @throws {nango.ActionError} - Throws an error if the input validation fails.
 */
export default async function runAction(nango: NangoAction, input: GorgiasCreateUser): Promise<GorgiasUser> {
    const parsedInput = gorgiasCreateUserSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create a user'
        });
    }

    const data: GorgiasCreateUserReq = {
        name: `${parsedInput.data.firstName} ${parsedInput.data.lastName}`,
        email: parsedInput.data.email.toLowerCase(),
        role: {
            name: parsedInput.data.role || 'agent'
        }
    };

    const config: ProxyConfiguration = {
        // https://developers.gorgias.com/reference/create-user
        endpoint: '/api/users',
        retries: 10,
        data
    };

    const response = await nango.post<GorgiasUserResponse>(config);

    const { data: dataResponse } = response;

    const user: GorgiasUser = {
        id: dataResponse.id.toString(),
        firstName: dataResponse.name.split(' ')[0] || '',
        lastName: dataResponse.name.split(' ')[1] || '',
        email: dataResponse.email
    };

    return user;
}
