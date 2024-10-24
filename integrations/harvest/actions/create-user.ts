import type { NangoAction, ProxyConfiguration, User, HarvestCreateUser } from '../../models';
import { toUser } from '../mappers/to-user';
import { harvestCreateUserSchema } from '../schema.zod.js';
import type { HarvestUser } from '../types';

// TODO: doc
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

// TODO: create user action + save responses + fixtures
// TODO: delete user action + save responses + fixtures
// TODO: list users sync
