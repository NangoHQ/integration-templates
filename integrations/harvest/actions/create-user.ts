import type { NangoAction, ProxyConfiguration, User, HarvestCreateUser } from '../../models';
import { harvestCreateUserSchema } from '../schema.zod.js';

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
        // https://developer.freshdesk.com/api/#create_agent
        endpoint: `/v2/users`,
        data: parsedInput.data,
        retries: 10
    };

    // TODO: get type for response
    const response = await nango.post<any>(config);
    const { data } = response;

    const user: User = {
        id: data.id || '',
        firstName: '',
        lastName: '',
        email: ''
    };

    return user;
}

// TODO: create user action + save responses + fixtures
// TODO: delete user action + save responses + fixtures
// TODO: list users sync
